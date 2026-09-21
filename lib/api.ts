import {
  clearSession,
  getStoredAccessToken,
  persistSession,
} from "@/lib/session";

/** Same-origin in the browser (Next proxies /api). Direct URL only for SSR. */
function apiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleCode: string;
  permissions: string[];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = RequestInit & {
  token?: string | null;
  skipAuthRefresh?: boolean;
};

const AUTH_SKIP_REFRESH = new Set([
  "/api/auth/login",
  "/api/auth/refresh",
  "/api/auth/logout",
]);

let refreshInFlight: Promise<string | null> | null = null;

async function readJson(res: Response): Promise<Record<string, unknown>> {
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

function errorFromBody(res: Response, body: Record<string, unknown>) {
  const err = body.error as { code?: string; message?: string } | undefined;
  return new ApiError(
    res.status,
    err?.code ?? "ERROR",
    err?.message ?? "Request failed",
  );
}

async function refreshSessionOnce(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const timeoutMs = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 30_000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${apiBase()}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      const body = await readJson(res);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          clearSession();
        }
        return null;
      }
      const data = body.data as
        | { accessToken?: string; user?: AuthUser }
        | undefined;
      const accessToken = data?.accessToken;
      if (!accessToken) {
        clearSession();
        return null;
      }
      persistSession(accessToken, data.user ?? null);
      return accessToken;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, signal, skipAuthRefresh, ...rest } = options;
  const timeoutMs = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS ?? 30_000);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const access = token ?? getStoredAccessToken();

  try {
    const res = await fetch(`${apiBase()}${path}`, {
      ...rest,
      signal: controller.signal,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(access ? { Authorization: `Bearer ${access}` } : {}),
        ...headers,
      },
    });

    const body = await readJson(res);
    if (
      res.status === 401 &&
      !skipAuthRefresh &&
      !AUTH_SKIP_REFRESH.has(path)
    ) {
      const next = await refreshSessionOnce();
      if (next) {
        return request<T>(path, {
          ...options,
          token: next,
          skipAuthRefresh: true,
        });
      }
    }
    if (!res.ok) {
      throw errorFromBody(res, body);
    }
    return body as T;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "TIMEOUT", "The request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export { refreshSessionOnce as refreshAccessToken };

export const api = {
  login(email: string, password: string) {
    return request<{ data: { user: AuthUser; accessToken: string } }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
        skipAuthRefresh: true,
      },
    ).then((res) => {
      persistSession(res.data.accessToken, res.data.user);
      return res;
    });
  },
  refresh() {
    return request<{ data: { user: AuthUser; accessToken: string } }>(
      "/api/auth/refresh",
      {
        method: "POST",
        body: JSON.stringify({}),
        skipAuthRefresh: true,
      },
    ).then((res) => {
      persistSession(res.data.accessToken, res.data.user);
      return res;
    });
  },
  me(token?: string) {
    return request<{ data: { user: AuthUser } }>("/api/auth/me", { token });
  },
  logout(token?: string | null) {
    return request<{ data: { ok: boolean } }>("/api/auth/logout", {
      method: "POST",
      token,
      skipAuthRefresh: true,
    }).finally(() => {
      clearSession();
    });
  },
  getTeams(token: string, search?: string) {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<{ data: { teams: Team[] } }>(`/api/teams${q}`, { token });
  },
  getTeam(token: string, id: string) {
    return request<{ data: { team: Team } }>(`/api/teams/${id}`, { token });
  },
  getTeamMembers(token: string, id: string) {
    return request<{ data: { members: TeamMember[] } }>(
      `/api/teams/${id}/members`,
      { token },
    );
  },
  addTeamMember(
    token: string,
    teamId: string,
    body: { userId: string; roleInTeam: string },
  ) {
    return request<{ data: { membership: TeamMember } }>(
      `/api/teams/${teamId}/members`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  endTeamMember(token: string, teamId: string, membershipId: string) {
    return request<{ data: { membership: TeamMember } }>(
      `/api/teams/${teamId}/members/${membershipId}/end`,
      { method: "POST", token, body: JSON.stringify({}) },
    );
  },
  createTeam(token: string, body: { name: string; description?: string }) {
    return request<{ data: { team: Team } }>("/api/teams", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getProfiles(token: string, params?: {
    search?: string;
    teamId?: string;
    includeHistory?: boolean;
    page?: number;
    pageSize?: number;
  }) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.teamId) sp.set("teamId", params.teamId);
    if (params?.includeHistory) sp.set("includeHistory", "true");
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 10));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        profiles: ProfileListItem[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/profiles${q}`, { token });
  },
  getProfile(token: string, id: string) {
    return request<{ data: { profile: ProfileDetail } }>(
      `/api/profiles/${id}`,
      { token },
    );
  },
  getIntervention(token: string, profileId: string) {
    return request<{ data: InterventionWorkspace }>(
      `/api/interventions/${profileId}`,
      { token },
    );
  },
  getInterventionTimeline(token: string, profileId: string) {
    return request<{
      data: {
        events: Array<{
          at: string;
          type: string;
          title: string;
          href?: string;
          entityId: string;
        }>;
      };
    }>(`/api/interventions/${profileId}/timeline`, { token });
  },
  getWorkspaceEvents(
    token: string,
    params: {
      profileId: string;
      type?: WorkspaceEventType;
      search?: string;
      range?: WorkspaceEventRange;
      eisenhowerCategory?: EisenhowerCategory;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    sp.set("profileId", params.profileId);
    if (params.type) sp.set("type", params.type);
    if (params.search) sp.set("search", params.search);
    if (params.range) sp.set("range", params.range);
    if (params.eisenhowerCategory)
      sp.set("eisenhowerCategory", params.eisenhowerCategory);
    if (params.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params.pageSize ?? 50));
    return request<{
      data: {
        events: WorkspaceEvent[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/workspace-events?${sp}`, { token });
  },
  createWorkspaceEvent(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      type: WorkspaceEventType;
      title: string;
      notes?: string | null;
      nextAction?: string | null;
      urgency?: EventUrgency;
      importance?: EventImportance;
      status?: WorkspaceEventStatus;
      occurredAt?: string;
      createLinkedRecord?: boolean;
    },
  ) {
    return request<{ data: { event: WorkspaceEvent } }>(
      "/api/workspace-events",
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  acknowledgeRecord(
    token: string,
    body: {
      entityType: "FEEDBACK" | "WEEKLY_REVIEW" | "ACTION_ITEM" | "INTERVENTION";
      entityId: string;
      salesExecutiveProfileId: string;
    },
  ) {
    return request<{ data: { acknowledgement: { id: string } } }>(
      "/api/interventions/acknowledgements",
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  transferAssignment(
    token: string,
    id: string,
    body: { newCommandoUserId: string; reason: string; teamLeadUserId?: string },
  ) {
    return request<{ data: { assignment: Assignment } }>(
      `/api/assignments/${id}/transfer`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  createProfile(
    token: string,
    body: {
      userId: string;
      teamId: string;
      displayName: string;
      employeeCode?: string;
    },
  ) {
    return request<{ data: { profile: ProfileListItem } }>("/api/profiles", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getAssignments(
    token: string,
    params?: {
      profileId?: string;
      currentOnly?: boolean;
      status?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.currentOnly) sp.set("currentOnly", "true");
    if (params?.status) sp.set("status", params.status);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 10));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        assignments: Assignment[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/assignments${q}`, { token });
  },
  getAssignment(token: string, id: string) {
    return request<{ data: { assignment: Assignment } }>(
      `/api/assignments/${id}`,
      { token },
    );
  },
  createAssignment(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      commandoUserId: string;
      teamLeadUserId: string;
      teamId: string;
      startedAt?: string;
    },
  ) {
    return request<{ data: { assignment: Assignment } }>("/api/assignments", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  endAssignment(
    token: string,
    id: string,
    body: {
      status: "COMPLETED" | "EXITED";
      endedAt?: string;
      completionReason?: string;
      outcome?: string;
      initialProblem?: string;
      interventionProvided?: string;
      improvementObserved?: string;
      remainingGaps?: string;
    },
  ) {
    return request<{ data: { assignment: Assignment } }>(
      `/api/assignments/${id}/end`,
      {
        method: "POST",
        token,
        body: JSON.stringify(body),
      },
    );
  },
  getUsers(
    token: string,
    params?: {
      search?: string;
      roleCode?: string;
      teamId?: string;
      isActive?: boolean;
      profileStatus?: "created" | "missing" | "n_a";
      page?: number;
      pageSize?: number;
      sort?: string;
      order?: "asc" | "desc";
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.roleCode) sp.set("roleCode", params.roleCode);
    if (params?.teamId) sp.set("teamId", params.teamId);
    if (params?.isActive !== undefined) sp.set("isActive", String(params.isActive));
    if (params?.profileStatus) sp.set("profileStatus", params.profileStatus);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 100));
    if (params?.sort) sp.set("sort", params.sort);
    if (params?.order) sp.set("order", params.order);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        users: ManagedUser[];
        page: number;
        pageSize: number;
        total: number;
      };
    }>(`/api/users${q}`, { token });
  },
  getUser(token: string, id: string) {
    return request<{ data: { user: ManagedUserDetail } }>(`/api/users/${id}`, {
      token,
    });
  },
  createUser(
    token: string,
    body: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      roleCode: string;
      isActive?: boolean;
      teamId?: string | null;
    },
  ) {
    return request<{ data: { user: ManagedUserDetail } }>("/api/users", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  updateUser(
    token: string,
    id: string,
    body: { firstName?: string; lastName?: string; email?: string },
  ) {
    return request<{ data: { user: ManagedUserDetail } }>(`/api/users/${id}`, {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    });
  },
  updateUserStatus(token: string, id: string, isActive: boolean) {
    return request<{ data: { user: ManagedUserDetail } }>(
      `/api/users/${id}/status`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ isActive }),
      },
    );
  },
  updateUserRole(token: string, id: string, roleCode: string) {
    return request<{ data: { user: ManagedUserDetail } }>(
      `/api/users/${id}/role`,
      {
        method: "PATCH",
        token,
        body: JSON.stringify({ roleCode }),
      },
    );
  },
  createSalesExecutive(
    token: string,
    body: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      isActive?: boolean;
      teamId: string;
      displayName: string;
      employeeCode?: string | null;
    },
  ) {
    return request<{
      data: {
        user: ManagedUserDetail;
        profile: {
          id: string;
          displayName: string;
          employeeCode: string | null;
          team: { id: string; name: string };
        };
      };
    }>("/api/users/sales-executives", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getUserProfile(token: string, id: string) {
    return request<{
      data: {
        profileStatus: "created" | "missing" | "n_a";
        profile: ManagedUserDetail["profile"];
      };
    }>(`/api/users/${id}/profile`, { token });
  },
  getReferrals(
    token: string,
    params?: {
      search?: string;
      status?: string;
      initiatedBy?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.initiatedBy) sp.set("initiatedBy", params.initiatedBy);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: { referrals: Referral[]; total: number; page: number; pageSize: number };
    }>(`/api/referrals${q}`, { token });
  },
  getReferral(token: string, id: string) {
    return request<{ data: { referral: Referral } }>(`/api/referrals/${id}`, {
      token,
    });
  },
  createReferral(token: string, body: CreateReferralBody) {
    return request<{ data: { referral: Referral } }>("/api/referrals", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getReferralCommandos(token: string) {
    return request<{
      data: {
        commandos: {
          id: string;
          email: string;
          firstName: string;
          lastName: string;
        }[];
      };
    }>("/api/referrals/options/commandos", { token });
  },
  getRequestableProfiles(token: string, search?: string) {
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        profiles: Array<{
          id: string;
          displayName: string;
          employeeCode: string | null;
          team: { id: string; name: string };
          teamLead: {
            id: string;
            firstName: string;
            lastName: string;
            email: string;
          } | null;
        }>;
      };
    }>(`/api/referrals/options/requestable-profiles${q}`, { token });
  },
  createCommandoRequest(
    token: string,
    body: { salesExecutiveProfileId: string; requestReason: string; note?: string | null },
  ) {
    return request<{ data: { referral: Referral } }>("/api/referrals/request", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  provideReferralInformation(
    token: string,
    id: string,
    body: ProvideReferralInformationBody,
  ) {
    return request<{ data: { referral: Referral } }>(
      `/api/referrals/${id}/provide-information`,
      {
        method: "POST",
        token,
        body: JSON.stringify(body),
      },
    );
  },
  rejectReferral(
    token: string,
    id: string,
    body: { rejectionReason: string },
  ) {
    return request<{ data: { referral: Referral } }>(
      `/api/referrals/${id}/reject`,
      {
        method: "POST",
        token,
        body: JSON.stringify(body),
      },
    );
  },
  acknowledgeReferral(token: string, id: string) {
    return request<{ data: { referral: Referral } }>(
      `/api/referrals/${id}/acknowledge`,
      { method: "POST", token },
    );
  },
  beginReferral(token: string, id: string) {
    return request<{ data: { referral: Referral } }>(
      `/api/referrals/${id}/begin`,
      { method: "POST", token },
    );
  },
  completeReferral(token: string, id: string) {
    return request<{ data: { referral: Referral } }>(
      `/api/referrals/${id}/complete`,
      { method: "POST", token },
    );
  },
  getSwotList(
    token: string,
    params?: {
      search?: string;
      teamId?: string;
      profileId?: string;
      commandoUserId?: string;
      source?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.teamId) sp.set("teamId", params.teamId);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.commandoUserId) sp.set("commandoUserId", params.commandoUserId);
    if (params?.source) sp.set("source", params.source);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: { items: SwotItem[]; total: number; page: number; pageSize: number };
    }>(`/api/swot${q}`, { token });
  },
  getSwot(token: string, id: string) {
    return request<{ data: { swot: SwotItem } }>(`/api/swot/${id}`, { token });
  },
  createSwot(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      strength?: string;
      weakness?: string;
      opportunity?: string;
      threat?: string;
      strengthPoints?: Array<{ text: string; visible?: boolean }>;
      weaknessPoints?: Array<{ text: string; visible?: boolean }>;
      opportunityPoints?: Array<{ text: string; visible?: boolean }>;
      threatPoints?: Array<{ text: string; visible?: boolean }>;
      visibleToSalesExecutive?: boolean;
      visibleStrength?: boolean;
      visibleWeakness?: boolean;
      visibleOpportunity?: boolean;
      visibleThreat?: boolean;
    },
  ) {
    return request<{ data: { swot: SwotItem } }>("/api/swot", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  setSwotVisibility(
    token: string,
    id: string,
    body: {
      visibleToSalesExecutive?: boolean;
      visibleStrength?: boolean;
      visibleWeakness?: boolean;
      visibleOpportunity?: boolean;
      visibleThreat?: boolean;
      point?: {
        quadrant: "strength" | "weakness" | "opportunity" | "threat";
        id: string;
        visible: boolean;
      };
    },
  ) {
    return request<{ data: { swot: SwotItem } }>(`/api/swot/${id}/visibility`, {
      method: "PATCH",
      token,
      body: JSON.stringify(body),
    });
  },
  getActivityTypes(
    token: string,
    params?:
      | boolean
      | {
          includeInactive?: boolean;
          search?: string;
          page?: number;
          pageSize?: number;
          catalog?: boolean;
        },
  ) {
    const opts =
      typeof params === "boolean"
        ? { includeInactive: params, catalog: !params }
        : params ?? { catalog: true };
    const sp = new URLSearchParams();
    if (opts.includeInactive) sp.set("includeInactive", "true");
    if (opts.search) sp.set("search", opts.search);
    if (opts.catalog) sp.set("catalog", "true");
    if (opts.page) sp.set("page", String(opts.page));
    sp.set("pageSize", String(opts.pageSize ?? (opts.catalog ? 100 : 10)));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        activityTypes: ActivityType[];
        total: number;
        page: number;
        pageSize: number;
        totalPages?: number;
      };
    }>(`/api/activity-types${q}`, { token });
  },
  createActivityType(
    token: string,
    body: {
      code?: string;
      name: string;
      description?: string;
      isActive?: boolean;
    },
  ) {
    return request<{ data: { activityType: ActivityType } }>(
      "/api/activity-types",
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  updateActivityType(
    token: string,
    id: string,
    body: {
      name?: string;
      description?: string | null;
      isActive?: boolean;
      archivedAt?: string | null;
    },
  ) {
    return request<{ data: { activityType: ActivityType } }>(
      `/api/activity-types/${id}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  deleteActivityType(token: string, id: string) {
    return request<{
      data: {
        deleted: boolean;
        archived: boolean;
        activityType: ActivityType | null;
        message: string;
      };
    }>(`/api/activity-types/${id}`, { method: "DELETE", token });
  },
  getDailyLogs(
    token: string,
    params?: {
      search?: string;
      profileId?: string;
      status?: "DRAFT" | "SUBMITTED";
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.status) sp.set("status", params.status);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: { logs: DailyLog[]; total: number; page: number; pageSize: number };
    }>(`/api/daily-logs${q}`, { token });
  },
  getDailyLogAttention(token: string, profileId: string) {
    const sp = new URLSearchParams({ profileId });
    return request<{ data: { logs: DailyLog[] } }>(
      `/api/daily-logs/attention?${sp}`,
      { token },
    );
  },
  getDailyLog(token: string, id: string) {
    return request<{ data: { log: DailyLog } }>(`/api/daily-logs/${id}`, {
      token,
    });
  },
  ensureDailyLog(
    token: string,
    body: { salesExecutiveProfileId: string; logDate?: string },
  ) {
    return request<{ data: { log: DailyLog } }>("/api/daily-logs/ensure", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  createDailyLog(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      activityTypeId: string;
      sessionTitle: string;
      observation: string;
      evidence?: string;
      seResponse?: string;
      coachingGiven?: string;
      expectedChange?: string;
      followUp?: string;
    },
  ) {
    return request<{ data: { log: DailyLog } }>("/api/daily-logs", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  addDailyLogEntry(
    token: string,
    logId: string,
    body: {
      activityTypeId: string;
      sessionTitle: string;
      observation: string;
      evidence?: string | null;
      seResponse?: string | null;
      coachingGiven?: string | null;
      expectedChange?: string | null;
      followUp?: string | null;
    },
  ) {
    return request<{ data: { log: DailyLog } }>(
      `/api/daily-logs/${logId}/entries`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  updateDailyLogEntry(
    token: string,
    logId: string,
    entryId: string,
    body: Partial<{
      activityTypeId: string;
      sessionTitle: string;
      observation: string;
      evidence: string | null;
      seResponse: string | null;
      coachingGiven: string | null;
      expectedChange: string | null;
      followUp: string | null;
    }>,
  ) {
    return request<{ data: { log: DailyLog } }>(
      `/api/daily-logs/${logId}/entries/${entryId}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  deleteDailyLogEntry(token: string, logId: string, entryId: string) {
    return request<{ data: { log: DailyLog } }>(
      `/api/daily-logs/${logId}/entries/${entryId}`,
      { method: "DELETE", token },
    );
  },
  submitDailyLog(
    token: string,
    logId: string,
    body: {
      classifications: Array<{
        entryId: string;
        urgency: "URGENT" | "NOT_URGENT";
        importance: "IMPORTANT" | "NOT_IMPORTANT";
      }>;
    },
  ) {
    return request<{
      data: {
        log: DailyLog;
        eisenhowerCreated: number;
        prioritizedCount: number;
      };
    }>(`/api/daily-logs/${logId}/submit`, {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getWeeklyReviews(
    token: string,
    params?: {
      search?: string;
      status?: "DRAFT" | "SUBMITTED";
      profileId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.status) sp.set("status", params.status);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        reviews: WeeklyReview[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/weekly-reviews${q}`, { token });
  },
  getWeeklyReviewHub(
    token: string,
    params: { profileId: string; weekStart?: string },
  ) {
    const sp = new URLSearchParams({ profileId: params.profileId });
    if (params.weekStart) sp.set("weekStart", params.weekStart);
    return request<{ data: WeeklyReviewHub }>(
      `/api/weekly-reviews/hub?${sp}`,
      { token },
    );
  },
  getWeeklyReview(token: string, id: string) {
    return request<{ data: { review: WeeklyReview } }>(
      `/api/weekly-reviews/${id}`,
      { token },
    );
  },
  createWeeklyReview(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      weekLabel: string;
      weekStartDate: string;
      meetingDate: string;
      roomName: string;
      meetingTime: string;
      meetingMinutes?: {
        key: string;
        fileName: string;
        contentType: string;
        size?: number;
      } | null;
      performanceSummary: string;
      whatWentWell: string;
      improvement: string;
      nextWeekAction?: string;
      nextWeekActions?: string[];
      followUpActions?: Array<{
        actionItemId: string;
        status: "COMPLETED" | "ACTIVE" | "CANCELLED";
      }>;
      attendeeUserIds?: string[];
    },
  ) {
    return request<{ data: { review: WeeklyReview } }>("/api/weekly-reviews", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  updateWeeklyReview(
    token: string,
    id: string,
    body: {
      weekLabel?: string;
      weekStartDate?: string;
      meetingDate?: string;
      roomName?: string;
      meetingTime?: string;
      meetingMinutes?: {
        key: string;
        fileName: string;
        contentType: string;
        size?: number;
      } | null;
      performanceSummary?: string;
      whatWentWell?: string;
      improvement?: string;
      nextWeekAction?: string;
      attendeeUserIds?: string[];
    },
  ) {
    return request<{ data: { review: WeeklyReview } }>(
      `/api/weekly-reviews/${id}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  submitWeeklyReview(token: string, id: string) {
    return request<{ data: { review: WeeklyReview } }>(
      `/api/weekly-reviews/${id}/submit`,
      { method: "POST", token },
    );
  },
  acknowledgeWeeklyReview(token: string, id: string) {
    return request<{ data: { review: WeeklyReview } }>(
      `/api/weekly-reviews/${id}/acknowledge`,
      { method: "POST", token },
    );
  },
  presignUpload(
    token: string,
    body: {
      purpose: "weekly-review-minutes";
      fileName: string;
      contentType: string;
      contentLength: number;
    },
  ) {
    return request<{
      data: {
        key: string;
        uploadUrl: string;
        headers: Record<string, string>;
        expiresInSeconds: number;
      };
    }>("/api/uploads/presign", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getWeeklyReviewMinutesUrl(token: string, id: string) {
    return request<{
      data: {
        url: string;
        fileName: string;
        contentType: string;
        expiresInSeconds: number;
      };
    }>(`/api/weekly-reviews/${id}/minutes-url`, { token });
  },
  getMonitoringCategories(
    token: string,
    params?:
      | boolean
      | {
          includeInactive?: boolean;
          search?: string;
          page?: number;
          pageSize?: number;
          catalog?: boolean;
        },
  ) {
    const opts =
      typeof params === "boolean"
        ? { includeInactive: params, catalog: !params }
        : params ?? { catalog: true };
    const sp = new URLSearchParams();
    if (opts.includeInactive) sp.set("includeInactive", "true");
    if (opts.search) sp.set("search", opts.search);
    if (opts.catalog) sp.set("catalog", "true");
    if (opts.page) sp.set("page", String(opts.page));
    sp.set("pageSize", String(opts.pageSize ?? (opts.catalog ? 100 : 10)));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        categories: MonitoringCategory[];
        total: number;
        page: number;
        pageSize: number;
        totalPages?: number;
      };
    }>(`/api/monitoring/categories${q}`, { token });
  },
  createMonitoringCategory(
    token: string,
    body: {
      code: string;
      name: string;
      description?: string;
      sortOrder?: number;
    },
  ) {
    return request<{ data: { category: MonitoringCategory } }>(
      "/api/monitoring/categories",
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  updateMonitoringCategory(
    token: string,
    id: string,
    body: {
      name?: string;
      description?: string | null;
      sortOrder?: number;
      isActive?: boolean;
      archivedAt?: string | null;
    },
  ) {
    return request<{ data: { category: MonitoringCategory } }>(
      `/api/monitoring/categories/${id}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  deleteMonitoringCategory(token: string, id: string) {
    return request<{
      data: {
        deleted: boolean;
        archived: boolean;
        category: MonitoringCategory | null;
        message: string;
      };
    }>(`/api/monitoring/categories/${id}`, {
      method: "DELETE",
      token,
    });
  },
  createMonitoringChecklistItem(
    token: string,
    categoryId: string,
    body: { code: string; label: string; sortOrder?: number },
  ) {
    return request<{ data: { item: MonitoringChecklistItem } }>(
      `/api/monitoring/categories/${categoryId}/items`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  updateMonitoringChecklistItem(
    token: string,
    id: string,
    body: {
      label?: string;
      sortOrder?: number;
      isActive?: boolean;
      archivedAt?: string | null;
    },
  ) {
    return request<{ data: { item: MonitoringChecklistItem } }>(
      `/api/monitoring/checklist-items/${id}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  getMonitoringRecords(
    token: string,
    params?: {
      search?: string;
      profileId?: string;
      categoryId?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.categoryId) sp.set("categoryId", params.categoryId);
    if (params?.dateFrom) sp.set("dateFrom", params.dateFrom);
    if (params?.dateTo) sp.set("dateTo", params.dateTo);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        records: MonitoringRecord[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/monitoring${q}`, { token });
  },
  getMonitoringRecord(token: string, id: string) {
    return request<{ data: { record: MonitoringRecord } }>(
      `/api/monitoring/${id}`,
      { token },
    );
  },
  getEffectiveMonitoringChecklist(
    token: string,
    profileId: string,
    categoryId: string,
  ) {
    const q = `?categoryId=${encodeURIComponent(categoryId)}`;
    return request<{
      data: {
        category: { id: string; code: string; name: string; description: string | null };
        items: EffectiveMonitoringChecklistItem[];
        canCustomize: boolean;
      };
    }>(`/api/monitoring/profiles/${profileId}/checklist${q}`, { token });
  },
  addSeMonitoringChecklistItem(
    token: string,
    profileId: string,
    body: {
      categoryId: string;
      label: string;
      description?: string | null;
      sortOrder?: number;
      scope?: "SE" | "SESSION";
    },
  ) {
    return request<{
      data: {
        item: EffectiveMonitoringChecklistItem;
        persisted: boolean;
      };
    }>(`/api/monitoring/profiles/${profileId}/checklist/items`, {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  removeSeMonitoringChecklistItem(
    token: string,
    profileId: string,
    itemId: string,
  ) {
    return request<{ data: { item: { id: string; isActive: boolean } } }>(
      `/api/monitoring/profiles/${profileId}/checklist/items/${itemId}`,
      { method: "DELETE", token },
    );
  },
  removeMonitoringTemplateItemFromSe(
    token: string,
    profileId: string,
    body: { categoryId: string; templateItemId: string },
  ) {
    return request<{ data: { item: unknown } }>(
      `/api/monitoring/profiles/${profileId}/checklist/remove-template`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  restoreMonitoringTemplateItemForSe(
    token: string,
    profileId: string,
    body: { categoryId: string; templateItemId: string },
  ) {
    return request<{ data: { item: unknown } }>(
      `/api/monitoring/profiles/${profileId}/checklist/restore-template`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  createMonitoringRecord(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      categoryId: string;
      observation?: string | null;
      observedAt?: string;
      responses: Array<{
        checklistItemId?: string;
        seChecklistItemId?: string;
        label?: string;
        description?: string | null;
        sourceType?: "TEMPLATE" | "CUSTOM" | "SESSION";
        sortOrder?: number;
        value: string;
      }>;
      supportInvolvement?: {
        none?: boolean;
        salesSupportUserIds?: string[];
      };
    },
  ) {
    return request<{ data: { record: MonitoringRecord } }>("/api/monitoring", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getSalesSupportLinks(
    token: string,
    params?: {
      profileId?: string;
      isActive?: boolean;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.isActive !== undefined) {
      sp.set("isActive", String(params.isActive));
    }
    if (params?.page) sp.set("page", String(params.page));
    if (params?.pageSize) sp.set("pageSize", String(params.pageSize));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        links: SalesSupportLink[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/sales-support-links${q}`, { token });
  },
  getSeSupportTeam(token: string, profileId: string) {
    return request<{ data: SeSupportTeamContext }>(
      `/api/sales-support-links/profiles/${profileId}/team`,
      { token },
    );
  },
  getEligibleSupportUsers(
    token: string,
    params?: { search?: string; profileId?: string },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{ data: { users: EligibleSupportUser[] } }>(
      `/api/sales-support-links/options/support-users${q}`,
      { token },
    );
  },
  assignSalesSupportLink(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      salesSupportUserId: string;
      responsibilityType?: string | null;
      note?: string | null;
    },
  ) {
    return request<{ data: { link: SalesSupportLink } }>(
      "/api/sales-support-links",
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  endSalesSupportLink(
    token: string,
    id: string,
    body?: { note?: string | null },
  ) {
    return request<{ data: { link: SalesSupportLink } }>(
      `/api/sales-support-links/${id}/end`,
      {
        method: "POST",
        token,
        body: JSON.stringify(body ?? {}),
      },
    );
  },
  getSyncEvaluations(
    token: string,
    params?: {
      search?: string;
      profileId?: string;
      salesSupportUserId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.salesSupportUserId) {
      sp.set("salesSupportUserId", params.salesSupportUserId);
    }
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        evaluations: SyncEvaluation[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/sync-evaluations${q}`, { token });
  },
  getSyncEvaluation(token: string, id: string) {
    return request<{ data: { evaluation: SyncEvaluation } }>(
      `/api/sync-evaluations/${id}`,
      { token },
    );
  },
  getSyncEvaluationSupportLinks(token: string, profileId: string) {
    return request<{ data: { links: SyncSupportLink[] } }>(
      `/api/sync-evaluations/options/support-links?profileId=${encodeURIComponent(profileId)}`,
      { token },
    );
  },
  createSyncEvaluation(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      salesSupportUserId: string;
      issue: string;
      recommendedAction: string;
    },
  ) {
    return request<{ data: { evaluation: SyncEvaluation } }>(
      "/api/sync-evaluations",
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  getSupportTasks(
    token: string,
    params?: {
      search?: string;
      view?: "active" | "history" | "all";
      filter?:
        | "active"
        | "completed"
        | "overdue"
        | "historical"
        | "blocked"
        | "all";
      status?: SupportTask["status"];
      priority?: "HIGH" | "MEDIUM" | "LOW";
      profileId?: string;
      salesSupportUserId?: string;
      salesSupportLinkId?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.view) sp.set("view", params.view);
    if (params?.filter) sp.set("filter", params.filter);
    if (params?.status) sp.set("status", params.status);
    if (params?.priority) sp.set("priority", params.priority);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.salesSupportUserId) {
      sp.set("salesSupportUserId", params.salesSupportUserId);
    }
    if (params?.salesSupportLinkId) {
      sp.set("salesSupportLinkId", params.salesSupportLinkId);
    }
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        tasks: SupportTask[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/support-tasks${q}`, { token });
  },
  getSupportTask(token: string, id: string) {
    return request<{ data: { task: SupportTask } }>(
      `/api/support-tasks/${id}`,
      { token },
    );
  },
  createSupportTask(
    token: string,
    body: {
      title: string;
      description?: string | null;
      purpose?: string | null;
      salesExecutiveProfileId: string;
      salesSupportUserId: string;
      priority?: "HIGH" | "MEDIUM" | "LOW";
      dueDate?: string | null;
      shouldDo?: string[];
      shouldNotDo?: string[];
    },
  ) {
    return request<{ data: { task: SupportTask } }>("/api/support-tasks", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  updateSupportTask(
    token: string,
    id: string,
    body: {
      title?: string;
      description?: string | null;
      purpose?: string | null;
      priority?: "HIGH" | "MEDIUM" | "LOW";
      dueDate?: string | null;
      salesSupportUserId?: string;
      reassignReason?: string | null;
      shouldDo?: string[];
      shouldNotDo?: string[];
    },
  ) {
    return request<{ data: { task: SupportTask } }>(
      `/api/support-tasks/${id}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  updateSupportTaskStatus(
    token: string,
    id: string,
    body: {
      status: SupportTask["status"];
      completionNotes?: string | null;
      blockedReason?: string | null;
    },
  ) {
    return request<{ data: { task: SupportTask } }>(
      `/api/support-tasks/${id}/status`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  addSupportTaskProgressNote(
    token: string,
    id: string,
    body: { body: string },
  ) {
    return request<{ data: { task: SupportTask } }>(
      `/api/support-tasks/${id}/progress-notes`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  getEisenhowerTasks(
    token: string,
    params?: {
      search?: string;
      profileId?: string;
      month?: string;
      category?: EisenhowerCategory;
      status?: EisenhowerStatus;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.month) sp.set("month", params.month);
    if (params?.category) sp.set("category", params.category);
    if (params?.status) sp.set("status", params.status);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 50));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        tasks: EisenhowerTask[];
        total: number;
        page: number;
        pageSize: number;
        currentMonth: string;
      };
    }>(`/api/eisenhower${q}`, { token });
  },
  getEisenhowerMatrix(
    token: string,
    params?: { profileId?: string; month?: string },
  ) {
    const sp = new URLSearchParams();
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.month) sp.set("month", params.month);
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        month: string;
        isCurrentMonth: boolean;
        byCategory: Record<EisenhowerCategory, EisenhowerTask[]>;
        tasks: EisenhowerTask[];
      };
    }>(`/api/eisenhower/matrix${q}`, { token });
  },
  getEisenhowerWorkspace(
    token: string,
    params: { profileId: string; assignmentId?: string },
  ) {
    const sp = new URLSearchParams();
    sp.set("profileId", params.profileId);
    if (params.assignmentId) sp.set("assignmentId", params.assignmentId);
    return request<{ data: EisenhowerWorkspace }>(
      `/api/eisenhower/workspace?${sp.toString()}`,
      { token },
    );
  },
  getEisenhowerTask(token: string, id: string) {
    return request<{ data: { task: EisenhowerTask } }>(
      `/api/eisenhower/${id}`,
      { token },
    );
  },
  createEisenhowerTask(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      month: string;
      category: EisenhowerCategory;
      title: string;
      notes?: string | null;
      dueDate?: string | null;
      status?: EisenhowerStatus;
    },
  ) {
    return request<{ data: { task: EisenhowerTask } }>("/api/eisenhower", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  updateEisenhowerTask(
    token: string,
    id: string,
    body: {
      category?: EisenhowerCategory;
      title?: string;
      notes?: string | null;
      dueDate?: string | null;
      month?: string;
    },
  ) {
    return request<{ data: { task: EisenhowerTask } }>(
      `/api/eisenhower/${id}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  updateEisenhowerTaskStatus(
    token: string,
    id: string,
    status: EisenhowerStatus,
  ) {
    return request<{ data: { task: EisenhowerTask } }>(
      `/api/eisenhower/${id}/status`,
      { method: "POST", token, body: JSON.stringify({ status }) },
    );
  },
  getActionItems(
    token: string,
    params?: {
      search?: string;
      profileId?: string;
      status?: ActionItemStatus;
      view?: "active" | "history" | "all";
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.status) sp.set("status", params.status);
    if (params?.view) sp.set("view", params.view);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        actionItems: ActionItem[];
        total: number;
        page: number;
        pageSize: number;
        view: string;
      };
    }>(`/api/action-items${q}`, { token });
  },
  getActionItem(token: string, id: string) {
    return request<{ data: { actionItem: ActionItemDetail } }>(
      `/api/action-items/${id}`,
      { token },
    );
  },
  createActionItem(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      title: string;
      description?: string | null;
      dueDate?: string | null;
    },
  ) {
    return request<{ data: { actionItem: ActionItem } }>("/api/action-items", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  updateActionItem(
    token: string,
    id: string,
    body: {
      title?: string;
      description?: string | null;
      dueDate?: string | null;
    },
  ) {
    return request<{ data: { actionItem: ActionItem } }>(
      `/api/action-items/${id}`,
      { method: "PATCH", token, body: JSON.stringify(body) },
    );
  },
  completeActionItem(token: string, id: string) {
    return request<{ data: { actionItem: ActionItem } }>(
      `/api/action-items/${id}/complete`,
      { method: "POST", token },
    );
  },
  expireActionItem(token: string, id: string) {
    return request<{ data: { actionItem: ActionItem } }>(
      `/api/action-items/${id}/expire`,
      { method: "POST", token },
    );
  },
  replaceActionItem(
    token: string,
    id: string,
    body: {
      title: string;
      description?: string | null;
      dueDate?: string | null;
    },
  ) {
    return request<{ data: { actionItem: ActionItem } }>(
      `/api/action-items/${id}/replace`,
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  getFeedback(
    token: string,
    params?: {
      search?: string;
      profileId?: string;
      source?: FeedbackSource;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.source) sp.set("source", params.source);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        feedback: FeedbackItem[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/feedback${q}`, { token });
  },
  getFeedbackItem(token: string, id: string) {
    return request<{ data: { feedback: FeedbackItem } }>(
      `/api/feedback/${id}`,
      { token },
    );
  },
  createFeedback(
    token: string,
    body: { salesExecutiveProfileId: string; body: string },
  ) {
    return request<{ data: { feedback: FeedbackItem } }>("/api/feedback", {
      method: "POST",
      token,
      body: JSON.stringify(body),
    });
  },
  getPerformanceEvaluations(
    token: string,
    params?: {
      search?: string;
      profileId?: string;
      source?: PerformanceSource;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.source) sp.set("source", params.source);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        evaluations: PerformanceEvaluation[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/performance${q}`, { token });
  },
  getPerformanceEvaluation(token: string, id: string) {
    return request<{ data: { evaluation: PerformanceEvaluation } }>(
      `/api/performance/${id}`,
      { token },
    );
  },
  createPerformanceEvaluation(
    token: string,
    body: {
      salesExecutiveProfileId: string;
      summary?: string | null;
      verdict?: string | null;
      rating?: number | null;
      scores: Array<{
        metricCode: string;
        metricLabel: string;
        scoreValue: number;
      }>;
    },
  ) {
    return request<{ data: { evaluation: PerformanceEvaluation } }>(
      "/api/performance",
      { method: "POST", token, body: JSON.stringify(body) },
    );
  },
  getPerformanceMetrics(token: string, profileId?: string) {
    const q = profileId ? `?profileId=${encodeURIComponent(profileId)}` : "";
    return request<{ data: { metrics: PerformanceMetrics } }>(
      `/api/performance/metrics${q}`,
      { token },
    );
  },
  getCommandoPerformanceReport(
    token: string,
    params?: {
      search?: string;
      teamId?: string;
      profileId?: string;
      commandoUserId?: string;
      status?: "ACTIVE" | "COMPLETED" | "EXITED";
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.teamId) sp.set("teamId", params.teamId);
    if (params?.profileId) sp.set("profileId", params.profileId);
    if (params?.commandoUserId) sp.set("commandoUserId", params.commandoUserId);
    if (params?.status) sp.set("status", params.status);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        rows: CommandoPerformanceReportRow[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/reports/commando-performance${q}`, { token });
  },
  getCommandoPerformanceReportDetail(token: string, assignmentId: string) {
    return request<{ data: { report: CommandoPerformanceReportDetail } }>(
      `/api/reports/commando-performance/${assignmentId}`,
      { token },
    );
  },
  getReportsOverview(token: string) {
    return request<{ data: ReportsOverview }>(`/api/reports/overview`, {
      token,
    });
  },
  getControlTower(token: string) {
    return request<{ data: ControlTowerData }>(`/api/dashboard/control-tower`, {
      token,
    });
  },
  getOrganizationStructure(token: string) {
    return request<{ data: OrganizationStructure }>(
      `/api/dashboard/organization`,
      { token },
    );
  },
  getAuditLogs(
    token: string,
    params?: {
      search?: string;
      actorId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      from?: string;
      to?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    const sp = new URLSearchParams();
    if (params?.search) sp.set("search", params.search);
    if (params?.actorId) sp.set("actorId", params.actorId);
    if (params?.action) sp.set("action", params.action);
    if (params?.entityType) sp.set("entityType", params.entityType);
    if (params?.entityId) sp.set("entityId", params.entityId);
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    if (params?.page) sp.set("page", String(params.page));
    sp.set("pageSize", String(params?.pageSize ?? 20));
    const q = sp.toString() ? `?${sp}` : "";
    return request<{
      data: {
        items: AuditLogItem[];
        total: number;
        page: number;
        pageSize: number;
      };
    }>(`/api/audit-logs${q}`, { token });
  },
  getAuditLog(token: string, id: string) {
    return request<{ data: { auditLog: AuditLogItem } }>(
      `/api/audit-logs/${id}`,
      { token },
    );
  },
  getAuditLogFacets(token: string) {
    return request<{
      data: { facets: { actions: string[]; entityTypes: string[] } };
    }>("/api/audit-logs/facets", { token });
  },
};

export type Team = {
  id: string;
  name: string;
  description?: string | null;
  memberCount?: number;
  profileCount?: number;
};

export type ManagedUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  role: { id: string; code: string; name: string };
  team: {
    id: string;
    name: string;
    membershipId: string;
    roleInTeam: string;
  } | null;
  profileStatus: "created" | "missing" | "n_a";
  profile: {
    id: string;
    displayName: string;
    archivedAt: string | null;
    team: { id: string; name: string };
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type ManagedUserDetail = Omit<ManagedUser, "profile"> & {
  memberships: Array<{
    id: string;
    roleInTeam: string;
    startedAt: string;
    team: { id: string; name: string; description: string | null };
  }>;
  profile: {
    id: string;
    displayName: string;
    employeeCode: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
    team: { id: string; name: string };
    currentAssignment: {
      id: string;
      status: string;
      startedAt: string;
      commando: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
      };
    } | null;
  } | null;
};

export type TeamMember = {
  id: string;
  roleInTeam: string;
  isActive: boolean;
  startedAt: string;
  endedAt: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: { code: string; name: string };
  };
};

export type Assignment = {
  id: string;
  salesExecutiveProfileId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  completionReason: string | null;
  totalDaysUnderCommando: number;
  teamId: string;
  team: { id: string; name: string };
  profile?: { id: string; displayName: string };
  commando: { id: string; firstName: string; lastName: string; email: string };
  teamLead: { id: string; firstName: string; lastName: string; email: string };
};

export type ProfileListItem = {
  id: string;
  displayName: string;
  employeeCode?: string | null;
  teamId: string;
  team: { id: string; name: string };
  user: { id: string; email: string; firstName: string; lastName: string };
  currentAssignment?: Assignment | null;
};

export type ProfileDetail = ProfileListItem & {
  currentAssignment: Assignment | null;
  assignmentHistory: Assignment[];
  totalDaysUnderCommando: number;
};

export type InterventionWorkspace = {
  profile: ProfileDetail;
  latestReferral: {
    id: string;
    status: string;
    whySalesIsDown: string;
    whatIsTheGap: string;
    detailedSummaryOfGap: string;
    supportAlreadyProvided: string;
    supportRequiredFromCommando: string;
    recommendationFocus: string;
    priority1: string | null;
    priority2: string | null;
    priority3: string | null;
    createdAt: string;
  } | null;
  latestSwot: {
    id: string;
    source: string;
    strength: string;
    weakness: string;
    opportunity: string;
    threat: string;
    createdAt: string;
  } | null;
  daysInIntervention: number;
  health: { status: "ON_TRACK" | "NEEDS_ATTENTION" | "AT_RISK"; reason: string };
  attention: Array<{ code: string; label: string; reason: string }>;
  nextAction: { label: string; owner: string; reason: string };
  overdueActions: Array<{ id: string; title: string; dueDate: string | null }>;
};

export type CreateReferralBody = {
  salesExecutiveProfileId: string;
  commandoUserId: string;
  profileName: string;
  whySalesIsDown: string;
  whatIsTheGap: string;
  detailedSummaryOfGap: string;
  supportAlreadyProvided: string;
  supportRequiredFromCommando: string;
  recommendationFocus: string;
  priority1: string;
  priority2: string;
  priority3: string;
  swot: {
    strength: string;
    weakness: string;
    opportunity: string;
    threat: string;
  };
};

export type ProvideReferralInformationBody = {
  whySalesIsDown: string;
  whatIsTheGap: string;
  detailedSummaryOfGap: string;
  supportAlreadyProvided: string;
  supportRequiredFromCommando: string;
  recommendationFocus: string;
  priority1: string;
  priority2: string;
  priority3: string;
  swot: {
    strength: string;
    weakness: string;
    opportunity: string;
    threat: string;
  };
};

export type Referral = {
  id: string;
  salesExecutiveProfileId: string;
  profile: { id: string; displayName: string; teamId: string };
  teamLeadUserId: string;
  teamLead: { id: string; firstName: string; lastName: string; email: string };
  teamId: string;
  team: { id: string; name: string };
  commandoUserId: string;
  commando: { id: string; firstName: string; lastName: string; email: string };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
  profileName: string;
  whySalesIsDown: string;
  whatIsTheGap: string;
  detailedSummaryOfGap: string;
  supportAlreadyProvided: string;
  supportRequiredFromCommando: string;
  recommendationFocus: string;
  priority1?: string | null;
  priority2?: string | null;
  priority3?: string | null;
  initiatedBy?: "TEAM_LEAD" | "COMMANDO";
  requestReason?: string | null;
  informationProvidedAt?: string | null;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  status: string;
  acknowledgedAt: string | null;
  acknowledgementNote?: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  teamLeadSwot: {
    id: string;
    strength: string;
    weakness: string;
    opportunity: string;
    threat: string;
    source: string;
    createdAt: string;
  } | null;
  allowedActions: string[];
};

export type SwotPoint = {
  id: string;
  text: string;
  visible: boolean;
};

export type SwotItem = {
  id: string;
  salesExecutiveProfileId: string;
  profile: { id: string; displayName: string; teamId: string };
  teamId: string;
  team: { id: string; name: string };
  assignmentId: string | null;
  source: "TEAM_LEAD" | "COMMANDO" | "SALES_EXECUTIVE";
  strength: string | null;
  weakness: string | null;
  opportunity: string | null;
  threat: string | null;
  strengthPoints?: SwotPoint[];
  weaknessPoints?: SwotPoint[];
  opportunityPoints?: SwotPoint[];
  threatPoints?: SwotPoint[];
  versionNumber?: number;
  supersedesId?: string | null;
  visibleToSalesExecutive?: boolean;
  visibleStrength?: boolean;
  visibleWeakness?: boolean;
  visibleOpportunity?: boolean;
  visibleThreat?: boolean;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  createdAt: string;
  updatedAt: string;
};

export type ActivityType = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  archivedAt: string | null;
};

export type DailyLogEntry = {
  id: string;
  dailyLogId: string;
  activityTypeId: string;
  activityType: { id: string; code: string; name: string };
  sessionTitle: string;
  observation: string;
  evidence: string | null;
  seResponse: string | null;
  coachingGiven: string | null;
  expectedChange: string | null;
  followUp: string | null;
  urgency: "URGENT" | "NOT_URGENT" | null;
  importance: "IMPORTANT" | "NOT_IMPORTANT" | null;
  eisenhowerCategory:
    | "DO_FIRST"
    | "SCHEDULE"
    | "DELEGATE"
    | "ELIMINATE"
    | null;
  eisenhowerTaskId: string | null;
  sortOrder: number;
  loggedAt: string;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  createdAt: string;
  updatedAt: string;
};

export type DailyLog = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId?: string;
    teamId?: string;
  };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    commando?: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
  } | null;
  logDate: string;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: string | null;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; email: string };
  entryCount: number;
  entries: DailyLogEntry[];
  createdAt: string;
  updatedAt: string;
  isEditable: boolean;
};

export type WeeklyReview = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
  };
  assignmentId: string | null;
  commandoUserId: string | null;
  commando: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  teamLeadUserId: string;
  teamLead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  weekLabel: string;
  weekStartDate: string;
  meetingDate: string;
  roomName: string | null;
  meetingTime: string | null;
  meetingMinutes: {
    fileName: string;
    contentType: string;
    size: number | null;
    uploadedAt: string | null;
  } | null;
  performanceSummary: string;
  whatWentWell: string;
  improvement: string;
  nextWeekAction: string;
  status: "DRAFT" | "SUBMITTED";
  submittedAt: string | null;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  attendees: Array<{
    id: string;
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: { code: string };
    };
    signedAt: string | null;
    createdAt: string;
  }>;
  myStatus: "SIGNED" | "PENDING_SIGNATURE" | "DRAFT" | null;
  signed: boolean;
  /** Whether the Sales Executive attendee has signed. */
  salesExecutiveSigned: boolean;
  createdAt: string;
  updatedAt: string;
  isEditable: boolean;
};

export type WeeklyReviewHubAction = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  weeklyReview: {
    id: string;
    weekLabel: string;
    weekStartDate: string;
    meetingDate: string;
    createdAt: string;
  } | null;
};

export type WeeklyReviewHubPerson = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: { code: string };
};

export type WeeklyReviewHub = {
  week: { start: string; end: string; label: string };
  profile: {
    id: string;
    displayName: string;
    teamName?: string;
    teamLead?: WeeklyReviewHubPerson | null;
    commando?: WeeklyReviewHubPerson | null;
    interventionActive?: boolean;
  };
  review: WeeklyReview | null;
  glance: {
    dailyLogs: number;
    dailyLogEntries: number;
    monitoring: number;
    actions: number;
    priorities: number;
    feedback?: number;
    swot?: number;
    support: number;
    overdueActions?: number;
    draftLogs?: number;
  };
  attention: string[];
  checklistFocus: Array<{ label: string; count: number }>;
  dailyLogs: Array<{
    id: string;
    logDate: string;
    status: "DRAFT" | "SUBMITTED";
    entryCount: number;
    submittedAt: string | null;
    entries: Array<{
      id: string;
      sessionTitle: string;
      observation: string;
      evidence: string | null;
      seResponse: string | null;
      coachingGiven: string | null;
      expectedChange: string | null;
      followUp: string | null;
      loggedAt: string;
      activityType: { id: string; name: string; code: string };
      eisenhowerCategory: string | null;
      hasEvidence: boolean;
      hasCoaching: boolean;
    }>;
  }>;
  monitoring: Array<{
    id: string;
    observedAt: string;
    category: { id: string; name: string; code: string };
    observation: string | null;
    checklistCompleted: number;
    checklistTotal: number;
    responses: Array<{
      id: string;
      label: string;
      description: string | null;
      value: string;
      sortOrder: number;
    }>;
    supportInvolvements: Array<{
      displayName: string;
      responsibility: string | null;
    }>;
  }>;
  actions: {
    completed: WeeklyReviewHubAction[];
    active: WeeklyReviewHubAction[];
    overdue: WeeklyReviewHubAction[];
    other: WeeklyReviewHubAction[];
  };
  feedback?: Array<{
    id: string;
    body: string;
    source: string;
    createdAt: string;
    createdBy: WeeklyReviewHubPerson;
  }>;
  swot?: Array<{
    id: string;
    source: string;
    strength: string | null;
    weakness: string | null;
    opportunity: string | null;
    threat: string | null;
    strengthPoints?: Array<{ id: string; text: string; visible: boolean }>;
    weaknessPoints?: Array<{ id: string; text: string; visible: boolean }>;
    opportunityPoints?: Array<{ id: string; text: string; visible: boolean }>;
    threatPoints?: Array<{ id: string; text: string; visible: boolean }>;
    versionNumber: number;
    createdAt: string;
    createdBy: WeeklyReviewHubPerson;
  }>;
  eisenhower: {
    DO_FIRST: Array<{
      id: string;
      title: string;
      notes: string | null;
      status: string;
      dueDate: string | null;
      category: string;
    }>;
    SCHEDULE: Array<{
      id: string;
      title: string;
      notes: string | null;
      status: string;
      dueDate: string | null;
      category: string;
    }>;
    DELEGATE: Array<{
      id: string;
      title: string;
      notes: string | null;
      status: string;
      dueDate: string | null;
      category: string;
    }>;
    ELIMINATE: Array<{
      id: string;
      title: string;
      notes: string | null;
      status: string;
      dueDate: string | null;
      category: string;
    }>;
  };
  support: Array<{
    monitoringId: string;
    observedAt: string;
    categoryName: string;
    displayName: string;
    responsibility: string | null;
  }>;
};

export type MonitoringChecklistItem = {
  id: string;
  categoryId: string;
  code: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
};

export type MonitoringCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  archivedAt: string | null;
  checklistItems: MonitoringChecklistItem[];
};

export type EffectiveMonitoringChecklistItem = {
  id: string;
  checklistItemId: string | null;
  seChecklistItemId: string | null;
  label: string;
  description: string | null;
  code: string | null;
  sortOrder: number;
  sourceType: "TEMPLATE" | "CUSTOM" | "SESSION";
};

export type MonitoringRecord = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
  };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
  categoryId: string;
  category: { id: string; code: string; name: string };
  observation: string | null;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  observedAt: string;
  createdAt: string;
  updatedAt: string;
  responses: Array<{
    id: string;
    checklistItemId: string | null;
    seChecklistItemId?: string | null;
    labelSnapshot?: string;
    descriptionSnapshot?: string | null;
    codeSnapshot?: string | null;
    sortOrderSnapshot?: number;
    sourceType?: string;
    isCustom?: boolean;
    checklistItem: {
      id: string;
      code: string;
      label: string;
      sortOrder: number;
      categoryId: string;
    };
    value: string;
    createdAt: string;
  }>;
  supportInvolvements?: Array<{
    id: string;
    salesSupportUserId: string;
    displayNameSnapshot: string;
    responsibilityTypeSnapshot: string | null;
    salesSupportLinkId?: string | null;
  }>;
};

export type SalesSupportUserBrief = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: { code: string };
};

export type EligibleSupportUser = SalesSupportUserBrief;

export type SalesSupportLink = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
    team?: { id: string; name: string };
  };
  salesSupportUserId: string;
  supportUser: SalesSupportUserBrief;
  responsibilityType: string | null;
  note: string | null;
  startedAt: string;
  endedAt: string | null;
  isActive: boolean;
  assignedById: string | null;
  assignedBy: SalesSupportUserBrief | null;
  endedById: string | null;
  endedBy: SalesSupportUserBrief | null;
  createdAt: string;
  updatedAt: string;
};

export type SeSupportTeamContext = {
  profile: {
    id: string;
    displayName: string;
    team: { id: string; name: string };
  };
  commando: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    assignmentId: string;
    status: string;
  } | null;
  activeSupport: SalesSupportLink[];
  history: SalesSupportLink[];
};

export type SyncSupportLink = {
  id: string;
  salesExecutiveProfileId: string;
  salesSupportUserId: string;
  supportUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  startedAt: string;
  isActive: boolean;
};

export type SyncEvaluation = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
  };
  salesSupportUserId: string;
  salesSupportUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  salesSupportLinkId: string | null;
  salesSupportLink: {
    id: string;
    isActive: boolean;
    startedAt: string;
    endedAt: string | null;
  } | null;
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    teamId: string;
  } | null;
  commando: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  teamLead: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  issue: string;
  recommendedAction: string;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  createdAt: string;
  updatedAt: string;
};

export type SupportTask = {
  id: string;
  title: string;
  description: string | null;
  purpose: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status:
    | "PENDING"
    | "ACCEPTED"
    | "IN_PROGRESS"
    | "BLOCKED"
    | "COMPLETED";
  dueDate: string | null;
  isOverdue: boolean;
  completedAt: string | null;
  completionNotes: string | null;
  blockedReason: string | null;
  blockedAt: string | null;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
  };
  salesSupportUserId: string;
  salesSupportUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  assignedById: string;
  assignedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    teamId: string;
  } | null;
  salesSupportLinkId: string | null;
  salesSupportLink: {
    id: string;
    isActive: boolean;
    startedAt: string;
    endedAt: string | null;
    responsibilityType: string | null;
  } | null;
  shouldDo: Array<{ id: string; text: string; sortOrder: number }>;
  shouldNotDo: Array<{ id: string; text: string; sortOrder: number }>;
  progressNotes: Array<{
    id: string;
    body: string;
    createdAt: string;
    createdBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: { code: string };
    };
  }>;
  assignmentHistory: Array<{
    id: string;
    fromSupportUserId: string | null;
    toSupportUserId: string;
    salesSupportLinkId: string | null;
    reason: string | null;
    changedBy: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: { code: string };
    };
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type EisenhowerCategory =
  | "DO_FIRST"
  | "SCHEDULE"
  | "DELEGATE"
  | "ELIMINATE";

export type WorkspaceEventType =
  | "MONITORING"
  | "COACHING"
  | "FEEDBACK"
  | "DAILY_LOG"
  | "REVIEW"
  | "ACTION"
  | "SUPPORT"
  | "INTERVENTION"
  | "SWOT"
  | "GENERAL";

export type EventUrgency = "URGENT" | "NOT_URGENT";
export type EventImportance = "IMPORTANT" | "NOT_IMPORTANT";
export type WorkspaceEventStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type WorkspaceEventRange = "today" | "week" | "month" | "all";

export type WorkspaceEvent = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
  };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
  type: WorkspaceEventType;
  title: string;
  notes: string | null;
  nextAction: string | null;
  urgency: EventUrgency;
  importance: EventImportance;
  status: WorkspaceEventStatus;
  eisenhowerCategory: EisenhowerCategory;
  occurredAt: string;
  sourceType: string | null;
  sourceId: string | null;
  href: string | null;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: { code: string } | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type EisenhowerStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "DONE"
  | "CANCELLED";

export type EisenhowerTask = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
  };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    commando?: {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
    };
  } | null;
  month: string;
  monthLabel: string;
  category: EisenhowerCategory;
  title: string;
  notes: string | null;
  dueDate: string | null;
  status: EisenhowerStatus;
  isExpired: boolean;
  isCurrentMonth: boolean;
  isHistory: boolean;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type EisenhowerWorkspacePerson = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

export type EisenhowerWorkspaceAssignment = {
  id: string;
  interventionNumber: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  commando: EisenhowerWorkspacePerson;
};

export type EisenhowerWorkspaceHistoryItem = {
  assignmentId: string;
  interventionNumber: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  commando: EisenhowerWorkspacePerson;
  taskCount: number;
  hasEisenhower: boolean;
  canViewMatrix: boolean;
};

export type EisenhowerCommandoOption = {
  assignmentId: string;
  interventionNumber: number;
  status: string;
  startedAt: string;
  endedAt: string | null;
  commando: EisenhowerWorkspacePerson;
  /** e.g. "Chris Commando (Commando)" */
  label: string;
  lockedForViewer: boolean;
  hasEisenhower: boolean;
  canViewMatrix: boolean;
};

export type EisenhowerWorkspace = {
  profileId: string;
  lifecycle: {
    isDuringCommando: boolean;
    isAfterCommando: boolean;
    hasActiveAssignment: boolean;
    hasCompletedAssignment: boolean;
  };
  latestFocus:
    | "TEAM_LEAD"
    | "COMMANDO"
    | "TEAM_LEAD_WITH_LOCKED_COMMANDO";
  activeIntervention: EisenhowerWorkspaceAssignment | null;
  teamLead: {
    owner: "TEAM_LEAD";
    label: string;
    availability: "AVAILABLE";
    tasks: EisenhowerTask[];
    updatedAt: string | null;
    updatedBy: EisenhowerWorkspacePerson | null;
  };
  commando: {
    owner: "COMMANDO";
    label: string;
    state: "LOCKED" | "AVAILABLE" | "EMPTY";
    lockedMessage: string | null;
    assignment: EisenhowerWorkspaceAssignment | null;
    tasks: EisenhowerTask[] | null;
    updatedAt: string | null;
    updatedBy: EisenhowerWorkspacePerson | null;
  };
  commandoOptions: EisenhowerCommandoOption[];
  interventionHistory: EisenhowerWorkspaceHistoryItem[];
};

export type ActionItemStatus =
  | "ACTIVE"
  | "COMPLETED"
  | "EXPIRED"
  | "REPLACED"
  | "CANCELLED";

export type ActionItem = {
  id: string;
  salesExecutiveProfileId: string;
  profile: {
    id: string;
    displayName: string;
    userId: string;
    teamId: string;
  };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
  weeklyReviewId?: string | null;
  weeklyReview?: {
    id: string;
    weekLabel: string;
    weekStartDate: string;
    meetingDate: string;
    createdAt: string;
  } | null;
  title: string;
  description: string | null;
  status: ActionItemStatus;
  dueDate: string | null;
  completedAt: string | null;
  completedById?: string | null;
  completedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  expiredAt: string | null;
  replacesId: string | null;
  replaces: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    expiredAt: string | null;
  } | null;
  replacedBy: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  commando: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  isActive: boolean;
  isHistory: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActionItemDetail = ActionItem & {
  previousActions: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    expiredAt: string | null;
  }>;
};

export type FeedbackSource = "TEAM_LEAD" | "COMMANDO";
export type PerformanceSource = "TEAM_LEAD" | "COMMANDO";

export type FeedbackItem = {
  id: string;
  salesExecutiveProfileId: string;
  profile: { id: string; displayName: string };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
  source: FeedbackSource;
  body: string;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  createdAt: string;
  updatedAt: string;
};

export type PerformanceScore = {
  id: string;
  metricCode: string;
  metricLabel: string;
  scoreValue: number;
  createdAt: string;
};

export type PerformanceEvaluation = {
  id: string;
  salesExecutiveProfileId: string;
  profile: { id: string; displayName: string };
  assignmentId: string | null;
  assignment: {
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
  } | null;
  source: PerformanceSource;
  summary: string | null;
  verdict: string | null;
  rating: number | null;
  scores: PerformanceScore[];
  averageMetricScore: number | null;
  evaluatedAt: string;
  createdById: string;
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { code: string };
  };
  createdAt: string;
  updatedAt: string;
};

export type PerformanceMetrics = {
  profile: { id: string; displayName: string };
  lifecycle: { isDuringCommando: boolean; isAfterCommando: boolean };
  totalDaysUnderCommando: number;
  activeAssignmentId: string | null;
  currentCommandoScore: {
    evaluationId: string | null;
    source: PerformanceSource;
    rating: number | null;
    averageMetricScore: number | null;
    evaluatedAt: string | null;
    scores: PerformanceScore[];
    visible: boolean;
    hiddenReason?: string | null;
  };
  myPerformanceMetric: {
    evaluationId: string;
    source: PerformanceSource;
    rating: number | null;
    averageMetricScore: number | null;
    verdict: string | null;
    evaluatedAt: string;
    scores: PerformanceScore[];
  } | null;
  teamLeadPerformance: {
    evaluationId: string;
    source: PerformanceSource;
    rating: number | null;
    averageMetricScore: number | null;
    evaluatedAt: string;
  } | null;
};

export type CommandoPerformanceReportRow = {
  assignmentId: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  daysAssigned: number;
  assigned: string;
  commando: { id: string; name: string; email: string };
  profile: { id: string; displayName: string; teamId: string };
  team: { id: string; name: string };
  teamLead: { id: string; name: string };
  avgScore: number | null;
  avgScoreSource: {
    evaluationId: string;
    source: "COMMANDO";
    scoreCount: number;
    evaluatedAt: string;
  } | null;
  rating: number | null;
  ratingSource: {
    evaluationId: string;
    source: "COMMANDO";
    storedRating: number | null;
    derivedFromAvgScore: boolean;
  } | null;
  starRating: number | null;
  tlVerdict: string | null;
  tlVerdictSource: {
    evaluationId: string;
    source: "TEAM_LEAD";
    evaluatedAt: string;
  } | null;
  swot: {
    count: number;
    bySource: {
      TEAM_LEAD: number;
      COMMANDO: number;
      SALES_EXECUTIVE: number;
    };
    swotIds: string[];
  };
  eisenhower: {
    count: number;
    byCategory: {
      DO_FIRST: number;
      SCHEDULE: number;
      DELEGATE: number;
      ELIMINATE: number;
    };
    taskIds: string[];
  };
};

export type CommandoPerformanceReportDetail = CommandoPerformanceReportRow & {
  sourceRecords: {
    performanceEvaluations: Array<{
      id: string;
      source: string;
      summary: string | null;
      verdict: string | null;
      rating: number | null;
      averageMetricScore: number | null;
      scores: Array<{
        id: string;
        metricCode: string;
        metricLabel: string;
        scoreValue: number;
      }>;
      evaluatedAt: string;
      createdBy: {
        id: string;
        firstName: string;
        lastName: string;
        role: { code: string };
      };
    }>;
    swotAnalyses: Array<{
      id: string;
      source: string;
      strength: string;
      weakness: string;
      opportunity: string;
      threat: string;
      createdAt: string;
      createdById: string;
    }>;
    eisenhowerTasks: Array<{
      id: string;
      title: string;
      category: string;
      status: string;
      month: string;
      dueDate: string | null;
    }>;
  };
};

export type AuditLogItem = {
  id: string;
  actorId: string | null;
  actor: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roleCode: string;
  } | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: unknown;
  createdAt: string;
};

export type ControlTowerAlert = {
  code: string;
  severity: "info" | "warning" | "critical";
  title: string;
  reason: string;
  href: string;
  count: number;
};

export type ControlTowerActivityItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { id: string; name: string; roleCode: string } | null;
  metadata: unknown;
};

export type ControlTowerData = {
  generatedAt?: string;
  metrics: {
    users: { total: number; active: number; inactive: number };
    teams: number;
    salesExecutives: number;
    interventions: {
      active: number;
      completed: number;
      exited: number;
    };
    referrals: {
      submitted: number;
      acknowledged: number;
      inProgress: number;
    };
    overdueActionItems: number;
    draftWeeklyReviews: number;
    submittedWeeklyReviewsLast7d: number;
    monitoringLast7d: number;
    overdueSupportTasks: number;
  };
  alerts: ControlTowerAlert[];
  attention: {
    pendingReferrals: Array<{
      id: string;
      profileId: string;
      profileName: string;
      teamName: string;
      teamLead: string;
      commando: string;
      createdAt: string;
    }>;
    overdueActions: Array<{
      id: string;
      title: string;
      dueDate: string | null;
      profileId: string;
      profileName: string;
    }>;
  };
  recentActivity?: ControlTowerActivityItem[];
};

export type OrganizationStructure = {
  teams: Array<{
    id: string;
    name: string;
    description: string | null;
    teamLeads: Array<{
      membershipId: string;
      roleInTeam: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        isActive: boolean;
        role: { code: string; name: string };
      };
    }>;
    salesSupport: Array<{
      membershipId: string;
      roleInTeam: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        isActive: boolean;
        role: { code: string; name: string };
      };
    }>;
    otherMembers: Array<{
      membershipId: string;
      roleInTeam: string;
      user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        isActive: boolean;
        role: { code: string; name: string };
      };
    }>;
    salesExecutives: Array<{
      id: string;
      displayName: string;
      employeeCode: string | null;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
      };
      currentAssignment: {
        id: string;
        status: string;
        startedAt: string;
        commando: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
        };
        teamLead: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
        };
      } | null;
    }>;
  }>;
};

export type ReportsOverview = {
  counts: {
    interventions: {
      active: number;
      completed: number;
      exited: number;
    };
    pendingReferrals: number;
    overdueActions: number;
    weeklyReviews: { draft: number; submitted: number };
    monitoringRecords: number;
    teams: number;
    salesExecutives: number;
    commandos: number;
  };
  modules: Array<{
    key: string;
    title: string;
    description: string;
    href: string;
  }>;
};
