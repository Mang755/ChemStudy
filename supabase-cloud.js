(function () {
  const DEFAULT_CONFIG = {
    url: "",
    anonKey: "",
    bucket: "teacher-files"
  };

  let client = null;

  function getConfig() {
    return {
      ...DEFAULT_CONFIG,
      ...(window.ChemStudySupabaseConfig || {})
    };
  }

  function isConfigured() {
    const config = getConfig();
    return Boolean(config.url && config.anonKey && window.supabase?.createClient);
  }

  function getClient() {
    if (!isConfigured()) {
      return null;
    }

    if (!client) {
      const config = getConfig();
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
    }

    return client;
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\u0400-\u04ff]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
  }

  function sanitizeFilename(value) {
    return String(value || "file")
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80);
  }

  function mapProfile(user, row) {
    return {
      id: user?.id || row?.id || "",
      name: row?.name || user?.user_metadata?.name || user?.email || "Мұғалім",
      school: row?.school || user?.user_metadata?.school || "",
      email: row?.email || user?.email || "",
      createdAt: row?.created_at || user?.created_at || new Date().toISOString()
    };
  }

  function mapTopic(row) {
    return {
      id: row.id,
      gradeId: row.grade_id,
      title: row.title,
      description: row.description || "",
      createdById: row.created_by_id || "",
      createdByEmail: row.created_by_email || "",
      createdAt: row.created_at || new Date().toISOString()
    };
  }

  function mapResource(row) {
    return {
      id: row.id,
      gradeId: row.grade_id,
      targetId: row.target_id,
      type: row.type,
      title: row.title,
      description: row.description || "",
      externalLink: row.external_link || "",
      fileName: row.file_name || "",
      mimeType: row.mime_type || "",
      storagePath: row.storage_path || "",
      fileUrl: row.file_url || "",
      blob: null,
      createdAt: row.created_at || new Date().toISOString(),
      createdBy: row.created_by || "Мұғалім",
      createdById: row.created_by_id || "",
      createdByEmail: row.created_by_email || ""
    };
  }

  async function getCurrentUser() {
    const supabaseClient = getClient();

    if (!supabaseClient) {
      return null;
    }

    const { data } = await supabaseClient.auth.getUser();
    return data?.user || null;
  }

  async function ensureProfile(user, profileInput) {
    const supabaseClient = getClient();

    if (!supabaseClient || !user) {
      return null;
    }

    const payload = {
      id: user.id,
      name: profileInput?.name || user.user_metadata?.name || user.email || "Мұғалім",
      school: profileInput?.school || user.user_metadata?.school || "",
      email: user.email || profileInput?.email || "",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from("teacher_profiles")
      .upsert(payload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapProfile(user, data);
  }

  async function loadProfile(user) {
    const supabaseClient = getClient();

    if (!supabaseClient || !user) {
      return null;
    }

    const { data, error } = await supabaseClient
      .from("teacher_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return ensureProfile(user);
    }

    return mapProfile(user, data);
  }

  async function saveProfile(profileInput) {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Алдымен мұғалім ретінде кіріңіз.");
    }

    return ensureProfile(user, {
      name: profileInput?.name || user.user_metadata?.name || user.email || "Мұғалім",
      school: profileInput?.school || user.user_metadata?.school || "",
      email: user.email || ""
    });
  }

  async function loadTopics() {
    const supabaseClient = getClient();

    if (!supabaseClient) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from("teacher_topics")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      return [];
    }

    return (data || []).map(mapTopic);
  }

  async function loadResources() {
    const supabaseClient = getClient();

    if (!supabaseClient) {
      return [];
    }

    const { data, error } = await supabaseClient
      .from("teacher_resources")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return [];
    }

    return (data || []).map(mapResource);
  }

  async function init() {
    if (!isConfigured()) {
      return {
        configured: false,
        profile: null,
        signedIn: false,
        topics: [],
        resources: []
      };
    }

    const user = await getCurrentUser();
    const [topics, resources, profile] = await Promise.all([
      loadTopics(),
      loadResources(),
      user ? loadProfile(user) : Promise.resolve(null)
    ]);

    return {
      configured: true,
      profile,
      signedIn: Boolean(user),
      topics,
      resources
    };
  }

  async function register(profileInput) {
    const supabaseClient = getClient();

    if (!supabaseClient) {
      throw new Error("Supabase бапталмаған.");
    }

    const { data, error } = await supabaseClient.auth.signUp({
      email: profileInput.email,
      password: profileInput.password,
      options: {
        data: {
          name: profileInput.name,
          school: profileInput.school || ""
        }
      }
    });

    if (error) {
      throw error;
    }

    const user = data.user || null;
    const session = data.session || null;
    const profile = user ? await ensureProfile(user, profileInput) : null;

    return {
      profile,
      signedIn: Boolean(session),
      needsEmailConfirmation: Boolean(user && !session)
    };
  }

  async function login(credentials) {
    const supabaseClient = getClient();

    if (!supabaseClient) {
      throw new Error("Supabase бапталмаған.");
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password
    });

    if (error) {
      throw error;
    }

    const user = data.user || data.session?.user || (await getCurrentUser());
    const profile = user ? await loadProfile(user) : null;

    return {
      profile,
      signedIn: Boolean(user)
    };
  }

  async function signOut() {
    const supabaseClient = getClient();

    if (!supabaseClient) {
      return;
    }

    const { error } = await supabaseClient.auth.signOut({ scope: "local" });

    if (error) {
      throw error;
    }
  }

  async function createTopic(input) {
    const supabaseClient = getClient();
    const user = await getCurrentUser();

    if (!supabaseClient || !user) {
      throw new Error("Материал жүктеу үшін алдымен мұғалім ретінде кіру керек.");
    }

    const payload = {
      id: input.id || `custom-${input.gradeId}-${slugify(input.title) || "topic"}-${Date.now()}`,
      grade_id: input.gradeId,
      title: input.title,
      description: input.description || "",
      created_by_id: user.id,
      created_by_email: user.email || input.createdByEmail || "",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from("teacher_topics")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapTopic(data);
  }

  async function uploadFile(resourceId, file, userId) {
    const supabaseClient = getClient();
    const config = getConfig();

    if (!supabaseClient || !file) {
      return { storagePath: "", fileUrl: "" };
    }

    const filePath = `${userId}/${resourceId}-${sanitizeFilename(file.name)}`;
    const { error: uploadError } = await supabaseClient.storage
      .from(config.bucket)
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type || void 0
      });

    if (uploadError) {
      throw uploadError;
    }

    const {
      data: { publicUrl }
    } = supabaseClient.storage.from(config.bucket).getPublicUrl(filePath);

    return {
      storagePath: filePath,
      fileUrl: publicUrl || ""
    };
  }

  async function createResource(input) {
    const supabaseClient = getClient();
    const user = await getCurrentUser();

    if (!supabaseClient || !user) {
      throw new Error("Материал жүктеу үшін алдымен мұғалім ретінде кіру керек.");
    }

    const resourceId = input.id || `resource-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const uploaded = input.file instanceof File && input.file.size
      ? await uploadFile(resourceId, input.file, user.id)
      : { storagePath: "", fileUrl: "" };

    const payload = {
      id: resourceId,
      grade_id: input.gradeId,
      target_id: input.targetId,
      type: input.type,
      title: input.title,
      description: input.description || "",
      external_link: input.externalLink || "",
      file_name: input.file instanceof File && input.file.size ? input.file.name : "",
      mime_type: input.file instanceof File && input.file.size ? input.file.type || "" : "",
      storage_path: uploaded.storagePath,
      file_url: uploaded.fileUrl,
      created_by: input.createdBy || user.user_metadata?.name || user.email || "Мұғалім",
      created_by_id: user.id,
      created_by_email: user.email || "",
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseClient
      .from("teacher_resources")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return mapResource(data);
  }

  async function deleteResource(resource) {
    const supabaseClient = getClient();
    const config = getConfig();

    if (!supabaseClient || !resource?.id) {
      return;
    }

    if (resource.storagePath) {
      await supabaseClient.storage.from(config.bucket).remove([resource.storagePath]);
    }

    const { error } = await supabaseClient.from("teacher_resources").delete().eq("id", resource.id);

    if (error) {
      throw error;
    }
  }

  window.ChemStudyCloud = {
    getConfig,
    isConfigured,
    init,
    register,
    login,
    signOut,
    saveProfile,
    createTopic,
    createResource,
    deleteResource
  };
})();
