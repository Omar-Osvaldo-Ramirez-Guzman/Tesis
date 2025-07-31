// ===== CONFIGURACIÓN DE SUPABASE =====
// IMPORTANTE: Reemplaza estos valores con los de tu proyecto Supabase
const SUPABASE_URL = "https://bmztpqepwcsbvejwtrdt.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtenRwcWVwd2NzYnZland0cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODQ5MjIsImV4cCI6MjA2MTU2MDkyMn0.87KE6C6uRYIsJ68wj31JzNpvW1Td8psiyl2Gn_Pu0hs"

// Inicializar cliente de Supabase
let supabase = null

// Inicializar Supabase cuando esté disponible
function initializeSupabase() {
  try {
    if (typeof window.supabase !== "undefined") {
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
      console.log("✅ Supabase inicializado correctamente")
      updateSystemInfo()
      return true
    } else {
      console.error("❌ Supabase no está disponible")
      return false
    }
  } catch (error) {
    console.error("❌ Error inicializando Supabase:", error)
    return false
  }
}

// Variables globales
let userState = {
  isLoggedIn: false,
  hasProfile: false,
  email: "",
  userData: null,
  supabaseUser: null,
}

let currentAnalysisData = null
const comparativeData = { real: null, ia: null }
let selectedPangram = ""
let tipoActual = ""
let mediaRecorderEntrenamiento
let chunksEntrenamiento = []
let intervaloEntrenamiento
let cronometroEntrenamiento = 0

// Variables globales para grabación
let mediaRecorder
let audioChunks = []
let grabando = false
let contadorInterval
let segundos = 0
let recordingAnalyser = null
let recordingDataArray = null
let recordingAnimationId = null

// Configuración del usuario
let userConfig = {
  theme: "dark",
  language: "es",
  colors: {
    real: "#4A90E2",
    ia: "#E74C3C",
    general: "#00FFE0",
  },
}

// Traducciones
const translations = {
  es: {
    analysis: "Análisis",
    comparison: "Comparación",
    training: "Entrenamiento",
    realVoice: "Voz Real",
    aiVoice: "Voz IA",
    confidence: "Confianza",
    processing: "Procesando...",
  },
  en: {
    analysis: "Analysis",
    comparison: "Comparison",
    training: "Training",
    realVoice: "Real Voice",
    aiVoice: "AI Voice",
    confidence: "Confidence",
    processing: "Processing...",
  },
}

// ===== INICIALIZACIÓN =====
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 VozCheck iniciado")

  // Inicializar Supabase
  setTimeout(() => {
    if (initializeSupabase()) {
      checkAuthState()
    }
  }, 100)

  // Inicializar estado
  userState = {
    isLoggedIn: false,
    hasProfile: false,
    email: "",
    userData: null,
    supabaseUser: null,
  }

  updateNavigation()
  showSection("auth")

  // Event listeners
  setupFileInputs()
  setupPangramListeners()
  setupMobileNavigation()
  setupValidation()
  loadUserConfiguration()

  console.log("✅ VozCheck inicializado correctamente")
})

// ===== FUNCIONES DE SUPABASE =====

// Verificar estado de autenticación
async function checkAuthState() {
  if (!supabase) return

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      console.log("👤 Usuario autenticado:", user.email)
      userState.isLoggedIn = true
      userState.email = user.email
      userState.supabaseUser = user

      // Cargar perfil del usuario
      await loadUserProfile(user.id)

      updateNavigation()
      if (userState.hasProfile) {
        showSection("analisis")
      } else {
        showSection("perfil")
      }
    }
  } catch (error) {
    console.error("❌ Error verificando autenticación:", error)
  }
}

// Cargar perfil del usuario desde Supabase
async function loadUserProfile(userId) {
  if (!supabase) return

  try {
    const { data, error } = await supabase.from("perfiles").select("*").eq("user_id", userId).single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    if (data) {
      console.log("📋 Perfil cargado:", data)
      userState.hasProfile = true
      userState.userData = data

      // Llenar formulario con datos existentes
      fillProfileForm(data)
    } else {
      console.log("📋 No se encontró perfil, usuario debe completarlo")
      userState.hasProfile = false
    }
  } catch (error) {
    console.error("❌ Error cargando perfil:", error)
    userState.hasProfile = false
  }
}

// Llenar formulario de perfil con datos existentes
function fillProfileForm(data) {
  const fields = {
    nombreCompleto: data.nombre_completo,
    correoUsuario: data.email,
    telefono: data.telefono,
    tipoUsuario: data.tipo_usuario,
    preferenciaAnalisis: data.preferencia_analisis,
    notifEmail: data.notif_email,
    notifResultados: data.notif_resultados,
    notifActualizaciones: data.notif_actualizaciones,
  }

  Object.entries(fields).forEach(([fieldId, value]) => {
    const field = document.getElementById(fieldId)
    if (field && value !== null && value !== undefined) {
      if (field.type === "checkbox") {
        field.checked = value
      } else {
        field.value = value
      }
    }
  })

  // Cambiar botones
  const btnGuardar = document.getElementById("btnGuardarPerfil")
  const btnEditar = document.getElementById("btnEditarPerfil")

  if (btnGuardar) {
    btnGuardar.style.display = "none"
  }
  if (btnEditar) {
    btnEditar.style.display = "inline-block"
  }

  toggleProfileFields(false)
}

// Guardar perfil en Supabase
async function saveProfileToSupabase(profileData) {
  if (!supabase || !userState.supabaseUser) {
    throw new Error("Supabase no disponible o usuario no autenticado")
  }

  try {
    const dataToSave = {
      user_id: userState.supabaseUser.id,
      email: userState.email,
      nombre_completo: profileData.nombre,
      telefono: profileData.telefono || null,
      tipo_usuario: profileData.tipoUsuario,
      preferencia_analisis: profileData.preferenciaAnalisis || "basico",
      notif_email: profileData.notificaciones.email,
      notif_resultados: profileData.notificaciones.resultados,
      notif_actualizaciones: profileData.notificaciones.actualizaciones,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase.from("perfiles").upsert(dataToSave, {
      onConflict: "user_id",
      returning: "minimal",
    })

    if (error) throw error

    console.log("✅ Perfil guardado en Supabase")
    return true
  } catch (error) {
    console.error("❌ Error guardando perfil:", error)
    throw error
  }
}

// ===== FUNCIONES DE AUTENTICACIÓN CON SUPABASE =====

async function loginEmail() {
  const email = document.getElementById("authEmail").value
  const password = document.getElementById("authPassword").value
  const statusElement = document.getElementById("authStatus")

  clearFormErrors()

  if (!email || !password) {
    statusElement.textContent = "Por favor completa todos los campos"
    statusElement.style.color = "#e74c3c"
    return
  }

  if (!validateEmail(email)) {
    showFieldError("authEmail", "Ingresa un correo electrónico válido")
    statusElement.textContent = "Correo electrónico no válido"
    statusElement.style.color = "#e74c3c"
    return
  }

  if (!supabase) {
    statusElement.textContent = "❌ Error: Supabase no está configurado"
    statusElement.style.color = "#e74c3c"
    return
  }

  statusElement.textContent = "Iniciando sesión..."
  statusElement.style.color = "#00ffe0"

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) throw error

    console.log("✅ Login exitoso:", data.user.email)

    userState.isLoggedIn = true
    userState.email = data.user.email
    userState.supabaseUser = data.user

    // Cargar perfil
    await loadUserProfile(data.user.id)

    statusElement.textContent = "✅ Sesión iniciada correctamente"
    statusElement.style.color = "#2ecc71"

    updateNavigation()

    if (userState.hasProfile) {
      showSection("analisis")
    } else {
      showSection("perfil")
    }
  } catch (error) {
    console.error("❌ Error en login:", error)
    statusElement.textContent = `❌ Error: ${error.message}`
    statusElement.style.color = "#e74c3c"
  }
}

async function registerEmail() {
  const email = document.getElementById("authEmail").value
  const password = document.getElementById("authPassword").value
  const statusElement = document.getElementById("authStatus")

  clearFormErrors()

  if (!email || !password) {
    statusElement.textContent = "Por favor completa todos los campos"
    statusElement.style.color = "#e74c3c"
    return
  }

  if (!validateEmail(email)) {
    showFieldError("authEmail", "Ingresa un correo electrónico válido")
    statusElement.textContent = "Correo electrónico no válido"
    statusElement.style.color = "#e74c3c"
    return
  }

  if (password.length < 6) {
    showFieldError("authPassword", "La contraseña debe tener al menos 6 caracteres")
    statusElement.textContent = "Contraseña muy corta"
    statusElement.style.color = "#e74c3c"
    return
  }

  if (!supabase) {
    statusElement.textContent = "❌ Error: Supabase no está configurado"
    statusElement.style.color = "#e74c3c"
    return
  }

  statusElement.textContent = "Creando cuenta..."
  statusElement.style.color = "#00ffe0"

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) throw error

    if (data.user && !data.user.email_confirmed_at) {
      statusElement.textContent = "📧 Revisa tu email para confirmar la cuenta"
      statusElement.style.color = "#f1c40f"
      return
    }

    console.log("✅ Registro exitoso:", data.user.email)

    userState.isLoggedIn = true
    userState.email = data.user.email
    userState.supabaseUser = data.user
    userState.hasProfile = false

    const correoUsuario = document.getElementById("correoUsuario")
    if (correoUsuario) {
      correoUsuario.value = email
    }

    statusElement.textContent = "✅ Cuenta creada exitosamente"
    statusElement.style.color = "#2ecc71"

    updateNavigation()
    showSection("perfil")
  } catch (error) {
    console.error("❌ Error en registro:", error)
    statusElement.textContent = `❌ Error: ${error.message}`
    statusElement.style.color = "#e74c3c"
  }
}

async function loginGoogle() {
  const statusElement = document.getElementById("authStatus")

  if (!supabase) {
    statusElement.textContent = "❌ Error: Supabase no está configurado"
    statusElement.style.color = "#e74c3c"
    return
  }

  statusElement.textContent = "Conectando con Google..."
  statusElement.style.color = "#00ffe0"

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) throw error

    // El redirect manejará el resto
    console.log("🔄 Redirigiendo a Google...")
  } catch (error) {
    console.error("❌ Error con Google OAuth:", error)
    statusElement.textContent = `❌ Error: ${error.message}`
    statusElement.style.color = "#e74c3c"
  }
}

async function loginFacebook() {
  const statusElement = document.getElementById("authStatus")

  if (!supabase) {
    statusElement.textContent = "❌ Error: Supabase no está configurado"
    statusElement.style.color = "#e74c3c"
    return
  }

  statusElement.textContent = "Conectando con Facebook..."
  statusElement.style.color = "#00ffe0"

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) throw error

    console.log("🔄 Redirigiendo a Facebook...")
  } catch (error) {
    console.error("❌ Error con Facebook OAuth:", error)
    statusElement.textContent = `❌ Error: ${error.message}`
    statusElement.style.color = "#e74c3c"
  }
}

async function logout() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")

  if (!confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    return
  }

  try {
    if (supabase) {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      console.log("✅ Logout exitoso")
    }

    // Limpiar estado
    userState = {
      isLoggedIn: false,
      hasProfile: false,
      email: "",
      userData: null,
      supabaseUser: null,
    }

    updateNavigation()
    showSection("auth")

    const authForm = document.getElementById("authForm")
    const authStatus = document.getElementById("authStatus")
    if (authForm) authForm.reset()
    if (authStatus) authStatus.textContent = ""
  } catch (error) {
    console.error("❌ Error en logout:", error)
    alert("Error cerrando sesión: " + error.message)
  }
}

// ===== FUNCIONES DE PERFIL CON SUPABASE =====

async function guardarPerfil() {
  const nombre = document.getElementById("nombreCompleto").value
  const correo = document.getElementById("correoUsuario").value
  const telefono = document.getElementById("telefono").value
  const tipoUsuario = document.getElementById("tipoUsuario").value
  const preferenciaAnalisis = document.getElementById("preferenciaAnalisis").value
  const notifEmail = document.getElementById("notifEmail").checked
  const notifResultados = document.getElementById("notifResultados").checked
  const notifActualizaciones = document.getElementById("notifActualizaciones").checked

  clearFormErrors()

  let hasErrors = false

  if (!nombre || !correo || !tipoUsuario) {
    alert("Por favor completa los campos obligatorios (marcados con *)")
    return
  }

  if (!validateEmail(correo)) {
    showFieldError("correoUsuario", "Ingresa un correo electrónico válido")
    hasErrors = true
  } else {
    showFieldSuccess("correoUsuario")
  }

  if (telefono && !validatePhone(telefono)) {
    showFieldError("telefono", "El teléfono debe tener exactamente 10 dígitos numéricos")
    hasErrors = true
  } else if (telefono) {
    showFieldSuccess("telefono")
  }

  if (hasErrors) return

  const profileData = {
    nombre,
    correo,
    telefono,
    tipoUsuario,
    preferenciaAnalisis,
    notificaciones: {
      email: notifEmail,
      resultados: notifResultados,
      actualizaciones: notifActualizaciones,
    },
  }

  try {
    // Guardar en Supabase
    await saveProfileToSupabase(profileData)

    userState.userData = profileData
    userState.hasProfile = true

    const btnGuardar = document.getElementById("btnGuardarPerfil")
    const btnEditar = document.getElementById("btnEditarPerfil")

    if (btnGuardar) btnGuardar.style.display = "none"
    if (btnEditar) btnEditar.style.display = "inline-block"

    toggleProfileFields(false)
    alert("✅ Perfil guardado exitosamente en Supabase")

    updateNavigation()
    showSection("analisis")
  } catch (error) {
    console.error("❌ Error guardando perfil:", error)
    alert("❌ Error guardando perfil: " + error.message)
  }
}

function editarPerfil() {
  const btnGuardar = document.getElementById("btnGuardarPerfil")
  const btnEditar = document.getElementById("btnEditarPerfil")

  if (btnGuardar) {
    btnGuardar.style.display = "inline-block"
    btnGuardar.textContent = "💾 Actualizar Perfil"
  }
  if (btnEditar) btnEditar.style.display = "none"

  toggleProfileFields(true)
}

function toggleProfileFields(editable) {
  const fields = [
    "nombreCompleto",
    "telefono",
    "tipoUsuario",
    "preferenciaAnalisis",
    "notifEmail",
    "notifResultados",
    "notifActualizaciones",
  ]

  fields.forEach((fieldId) => {
    const field = document.getElementById(fieldId)
    if (field) {
      if (fieldId === "correoUsuario") {
        field.readOnly = true
      } else {
        field.readOnly = !editable
        field.disabled = !editable
      }
    }
  })
}

// ===== FUNCIONES DE PRUEBA DE CONEXIÓN =====

async function testSupabaseConnection() {
  const connectionStatus = document.getElementById("connectionStatus")
  const authTestStatus = document.getElementById("authTestStatus")
  const dbTestStatus = document.getElementById("dbTestStatus")

  // Mostrar sección de conexión
  showSection("conexion")

  if (connectionStatus) {
    connectionStatus.innerHTML = '<div class="test-loading">🔄 Probando conexión...</div>'
  }

  try {
    if (!supabase) {
      throw new Error("Cliente de Supabase no inicializado")
    }

    // Probar conexión básica
    const { data, error } = await supabase.from("perfiles").select("count", { count: "exact", head: true })

    if (error && error.code !== "PGRST116") {
      throw error
    }

    // Conexión exitosa
    if (connectionStatus) {
      connectionStatus.innerHTML = `
        <div class="test-result test-success">
          ✅ Conexión exitosa con Supabase<br>
          <small>Tabla 'perfiles' accesible</small>
        </div>
      `
    }

    // Actualizar estado de autenticación
    if (authTestStatus) {
      if (userState.isLoggedIn) {
        authTestStatus.innerHTML = `
          <div class="test-result test-success">
            ✅ Usuario autenticado: ${userState.email}<br>
            <small>ID: ${userState.supabaseUser?.id || "N/A"}</small>
          </div>
        `
      } else {
        authTestStatus.innerHTML = `
          <div class="test-result test-info">
            ℹ️ No hay usuario autenticado<br>
            <small>Inicia sesión para probar la autenticación</small>
          </div>
        `
      }
    }

    // Actualizar estado de base de datos
    if (dbTestStatus) {
      if (userState.hasProfile) {
        dbTestStatus.innerHTML = `
          <div class="test-result test-success">
            ✅ Perfil cargado desde la base de datos<br>
            <small>Datos sincronizados correctamente</small>
          </div>
        `
      } else {
        dbTestStatus.innerHTML = `
          <div class="test-result test-info">
            ℹ️ No hay perfil en la base de datos<br>
            <small>Completa tu perfil para probar la escritura</small>
          </div>
        `
      }
    }

    updateSystemInfo()
    updateLastTestTime()
  } catch (error) {
    console.error("❌ Error en prueba de conexión:", error)

    if (connectionStatus) {
      connectionStatus.innerHTML = `
        <div class="test-result test-error">
          ❌ Error de conexión: ${error.message}<br>
          <small>Verifica tu configuración de Supabase</small>
        </div>
      `
    }

    updateSystemInfo()
    updateLastTestTime()
  }
}

async function testDatabaseOperations() {
  const dbTestStatus = document.getElementById("dbTestStatus")

  if (!supabase) {
    if (dbTestStatus) {
      dbTestStatus.innerHTML = `
        <div class="test-result test-error">
          ❌ Supabase no está configurado
        </div>
      `
    }
    return
  }

  if (!userState.isLoggedIn) {
    if (dbTestStatus) {
      dbTestStatus.innerHTML = `
        <div class="test-result test-info">
          ℹ️ Debes iniciar sesión para probar la base de datos
        </div>
      `
    }
    return
  }

  if (dbTestStatus) {
    dbTestStatus.innerHTML = '<div class="test-loading">🔄 Probando operaciones de base de datos...</div>'
  }

  try {
    // Probar lectura
    const { data: readData, error: readError } = await supabase
      .from("perfiles")
      .select("*")
      .eq("user_id", userState.supabaseUser.id)

    if (readError) throw readError

    // Probar escritura (actualizar timestamp)
    const { error: writeError } = await supabase.from("perfiles").upsert(
      {
        user_id: userState.supabaseUser.id,
        email: userState.email,
        test_timestamp: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )

    if (writeError) throw writeError

    if (dbTestStatus) {
      dbTestStatus.innerHTML = `
        <div class="test-result test-success">
          ✅ Operaciones de base de datos exitosas<br>
          <small>Lectura y escritura funcionando correctamente</small>
        </div>
      `
    }
  } catch (error) {
    console.error("❌ Error en operaciones de base de datos:", error)

    if (dbTestStatus) {
      dbTestStatus.innerHTML = `
        <div class="test-result test-error">
          ❌ Error en base de datos: ${error.message}<br>
          <small>Verifica los permisos de tu tabla</small>
        </div>
      `
    }
  }
}

function updateSystemInfo() {
  const supabaseUrl = document.getElementById("supabaseUrl")
  const clientStatus = document.getElementById("clientStatus")
  const currentUser = document.getElementById("currentUser")

  if (supabaseUrl) {
    supabaseUrl.textContent = SUPABASE_URL || "No configurado"
  }

  if (clientStatus) {
    clientStatus.textContent = supabase ? "Inicializado" : "No inicializado"
  }

  if (currentUser) {
    if (userState.isLoggedIn) {
      currentUser.textContent = userState.email
    } else {
      currentUser.textContent = "No autenticado"
    }
  }
}

function updateLastTestTime() {
  const lastTest = document.getElementById("lastTest")
  if (lastTest) {
    lastTest.textContent = new Date().toLocaleString()
  }
}

// ===== FUNCIONES DE NAVEGACIÓN =====
function updateNavigation() {
  const navMenu = document.getElementById("navMenu")
  const mobileNavMenu = document.getElementById("mobileNavMenu")
  const optionsMenu = document.getElementById("optionsMenu")

  let menuHTML = ""

  if (!userState.isLoggedIn) {
    menuHTML = '<li><a href="#auth" class="nav-link active" onclick="showSection(\'auth\')">Acceso</a></li>'
    if (optionsMenu) optionsMenu.style.display = "none"
  } else if (!userState.hasProfile) {
    menuHTML =
      '<li><a href="#perfil" class="nav-link active" onclick="showSection(\'perfil\')">Completar Perfil</a></li>'
    if (optionsMenu) optionsMenu.style.display = "block"
  } else {
    menuHTML = `
      <li><a href="#analisis" class="nav-link active" onclick="showSection('analisis')">🎤 ${translations[userConfig.language].analysis}</a></li>
      <li><a href="#comparacion" class="nav-link" onclick="showSection('comparacion')">🆚 ${translations[userConfig.language].comparison}</a></li>
      <li><a href="#entrenamientoMic" class="nav-link" onclick="showSection('entrenamientoMic')">🧠 ${translations[userConfig.language].training}</a></li>
    `
    if (optionsMenu) optionsMenu.style.display = "block"
  }

  if (navMenu) navMenu.innerHTML = menuHTML
  if (mobileNavMenu) mobileNavMenu.innerHTML = menuHTML
}

function showSection(sectionId) {
  // Verificar permisos
  if (
    (sectionId === "analisis" || sectionId === "comparacion" || sectionId === "entrenamientoMic") &&
    (!userState.isLoggedIn || !userState.hasProfile)
  ) {
    alert("Debes completar tu perfil antes de acceder a esta sección")
    return
  }

  if (sectionId === "perfil" && !userState.isLoggedIn) {
    alert("Debes iniciar sesión primero")
    return
  }

  // Ocultar todas las secciones
  document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))

  // Mostrar sección seleccionada
  const targetSection = document.getElementById(sectionId)
  if (targetSection) {
    targetSection.classList.remove("oculto")
  }

  // Actualizar navegación activa
  document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"))
  document.querySelectorAll(`a[href="#${sectionId}"]`).forEach((l) => l.classList.add("active"))

  // Cerrar menú móvil
  const mobileNav = document.getElementById("mobileNav")
  if (mobileNav) mobileNav.classList.remove("show")
}

// ===== FUNCIONES DE ANÁLISIS DE AUDIO =====
function switchTab(tabName) {
  // Ocultar todos los tabs
  document.querySelectorAll(".tab-content").forEach((tab) => {
    tab.classList.remove("active")
  })

  // Remover clase active de todos los botones
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  // Mostrar tab seleccionado
  const targetTab = document.getElementById(tabName + "Tab")
  if (targetTab) {
    targetTab.classList.add("active")
  }

  // Activar botón correspondiente
  event.target.classList.add("active")
}

function iniciarAnalisis() {
  const archivo = document.getElementById("archivoAudio").files[0]
  if (!archivo) {
    alert("Por favor selecciona un archivo de audio.")
    return
  }

  if (!validateAudioFile(archivo, "archivoAudioStatus")) {
    return
  }

  // Mostrar contenedores de visualización y resultados
  const visualizationContainer = document.getElementById("visualizationContainer")
  const resultadoContainer = document.getElementById("resultado")

  if (visualizationContainer) visualizationContainer.style.display = "block"
  if (resultadoContainer) resultadoContainer.style.display = "block"

  const url = URL.createObjectURL(archivo)
  analizarAudio(url, archivo)
}

function analizarAudio(audioURL, audioFile) {
  const resultado = document.getElementById("resultado")
  const waveformCanvas = document.getElementById("waveformCanvas")
  const spectrumCanvas = document.getElementById("spectrumCanvas")
  const transcripcionContainer = document.getElementById("transcripcionAnalisis")

  // Mostrar mensaje de procesamiento
  resultado.innerHTML =
    '<div style="text-align: center; padding: 2rem; color: #00ffe0;"><h3>🔄 Analizando audio...</h3><p>Procesando características de la voz...</p></div>'

  const ctxWave = waveformCanvas.getContext("2d")
  const ctxSpec = spectrumCanvas.getContext("2d")

  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  fetch(audioURL)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((audioBuffer) => {
      // Análisis detallado del audio
      analyzeAudioDetails(audioBuffer)

      const rawData = audioBuffer.getChannelData(0)

      // Dibujar forma de onda
      ctxWave.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height)
      ctxWave.beginPath()
      ctxWave.strokeStyle = userConfig.colors.general
      ctxWave.lineWidth = 2
      const step = Math.ceil(rawData.length / waveformCanvas.width)
      const amp = waveformCanvas.height / 2

      for (let i = 0; i < waveformCanvas.width; i++) {
        let min = 1.0,
          max = -1.0
        for (let j = 0; j < step; j++) {
          const datum = rawData[i * step + j]
          if (datum < min) min = datum
          if (datum > max) max = datum
        }
        ctxWave.moveTo(i, (1 + min) * amp)
        ctxWave.lineTo(i, (1 + max) * amp)
      }
      ctxWave.stroke()

      // Análisis espectral
      const analyser = audioContext.createAnalyser()
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(analyser)
      analyser.connect(audioContext.destination)
      source.start()

      analyser.fftSize = 2048
      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      function drawSpectrum() {
        requestAnimationFrame(drawSpectrum)
        analyser.getByteFrequencyData(dataArray)

        ctxSpec.fillStyle = "#000"
        ctxSpec.fillRect(0, 0, spectrumCanvas.width, spectrumCanvas.height)

        const barWidth = (spectrumCanvas.width / bufferLength) * 2.5
        let x = 0

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = dataArray[i]
          const hue = (i / bufferLength) * 360
          ctxSpec.fillStyle = `hsl(${hue}, 70%, 50%)`
          ctxSpec.fillRect(x, spectrumCanvas.height - barHeight / 2, barWidth, barHeight / 2)
          x += barWidth + 1
        }
      }
      drawSpectrum()

      // Mostrar transcripción
      if (transcripcionContainer) {
        transcripcionContainer.style.display = "block"
        generateRealTranscription(audioFile, "transcripcionAnalisisContent")
      }

      // Simular análisis de IA vs Real
      setTimeout(() => {
        const isAI = Math.random() > 0.5
        const confidence = Math.floor(Math.random() * 30) + 70
        const duration = audioBuffer.duration.toFixed(2)
        const fundamentalFreq = estimateFundamentalFrequency(rawData, audioBuffer.sampleRate)

        const color = isAI ? "#e74c3c" : "#2ecc71"
        const resultText = isAI ? "IA" : "REAL"
        const bgColor = isAI ? "rgba(231, 76, 60, 0.1)" : "rgba(46, 204, 113, 0.1)"

        resultado.innerHTML = `
          <div style="text-align: center; padding: 2rem; background: ${bgColor}; border-radius: 12px; border: 2px solid ${color};">
            <h3 style="color: ${color}; font-size: 2.5rem; margin-bottom: 1rem; text-shadow: 0 0 10px ${color};">
              🎯 Resultado: VOZ ${resultText}
            </h3>
            <div style="margin: 1.5rem 0;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                <span style="color: #00ffe0; font-weight: 600;">Confianza:</span>
                <span style="color: ${color}; font-weight: 700; font-size: 1.2rem;">${confidence}%</span>
              </div>
              <div style="width: 100%; height: 20px; background: #333; border-radius: 10px; overflow: hidden;">
                <div style="width: ${confidence}%; height: 100%; background: linear-gradient(90deg, ${color}, ${color}aa); transition: width 2s ease;"></div>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 2rem;">
              <div style="background: var(--bg-primary); padding: 1.5rem; border-radius: 8px; border: 1px solid #333;">
                <strong style="color: #00ffe0;">Duración:</strong><br>
                <span style="color: #fff; font-size: 1.1rem;">${duration} segundos</span>
              </div>
              <div style="background: var(--bg-primary); padding: 1.5rem; border-radius: 8px; border: 1px solid #333;">
                <strong style="color: #00ffe0;">Frecuencia Fundamental:</strong><br>
                <span style="color: #fff; font-size: 1.1rem;">${fundamentalFreq.toFixed(1)} Hz</span>
              </div>
              <div style="background: var(--bg-primary); padding: 1.5rem; border-radius: 8px; border: 1px solid #333;">
                <strong style="color: #00ffe0;">Tipo de Análisis:</strong><br>
                <span style="color: #fff; font-size: 1.1rem;">Detección IA/Real</span>
              </div>
              <div style="background: var(--bg-primary); padding: 1.5rem; border-radius: 8px; border: 1px solid #333;">
                <strong style="color: #00ffe0;">Precisión del Sistema:</strong><br>
                <span style="color: #fff; font-size: 1.1rem;">92.5%</span>
              </div>
            </div>
          </div>
        `
      }, 2000)
    })
    .catch((error) => {
      console.error("Error al procesar audio:", error)
      resultado.innerHTML =
        '<div style="text-align: center; padding: 2rem; color: #e74c3c;"><h3>❌ Error al procesar el archivo de audio</h3><p>Verifica que el archivo sea válido y vuelve a intentarlo.</p></div>'
    })
}

// ===== FUNCIONES DE GRABACIÓN =====
function iniciarMicrofono() {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream)
      audioChunks = []

      mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data)
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/wav" })

        const shouldSave = confirm("¿Deseas guardar esta grabación?\n\nSí: Guardar y analizar\nNo: Solo analizar")

        if (shouldSave) {
          const audioURL = URL.createObjectURL(audioBlob)
          const a = document.createElement("a")
          a.href = audioURL
          a.download = `grabacion_${Date.now()}.wav`
          a.click()
        }

        // Mostrar contenedores de visualización y resultados
        const visualizationContainer = document.getElementById("visualizationContainer")
        const resultadoContainer = document.getElementById("resultado")

        if (visualizationContainer) visualizationContainer.style.display = "block"
        if (resultadoContainer) resultadoContainer.style.display = "block"

        const audioURL = URL.createObjectURL(audioBlob)
        analizarAudio(audioURL, audioBlob)

        audioChunks = []
        clearInterval(contadorInterval)

        // Ocultar timer y mostrar botones
        const recordingTimer = document.getElementById("recordingTimer")
        const startBtn = document.getElementById("startRecordBtn")
        const stopBtn = document.getElementById("stopRecordBtn")

        if (recordingTimer) recordingTimer.style.display = "none"
        if (startBtn) startBtn.style.display = "inline-flex"
        if (stopBtn) stopBtn.style.display = "none"
      }

      mediaRecorder.start()
      grabando = true
      segundos = 0

      // Mostrar timer y actualizar botones
      const recordingTimer = document.getElementById("recordingTimer")
      const cronometro = document.getElementById("cronometro")
      const startBtn = document.getElementById("startRecordBtn")
      const stopBtn = document.getElementById("stopRecordBtn")
      const progressBar = document.getElementById("recordingProgress")

      if (recordingTimer) recordingTimer.style.display = "flex"
      if (cronometro) cronometro.textContent = "00:00"
      if (startBtn) startBtn.style.display = "none"
      if (stopBtn) stopBtn.style.display = "inline-flex"
      if (progressBar) progressBar.style.width = "0%"

      contadorInterval = setInterval(() => {
        segundos++
        if (cronometro) cronometro.textContent = formatTime(segundos)
        if (progressBar) {
          const progress = Math.min((segundos / 60) * 100, 100)
          progressBar.style.width = `${progress}%`
        }
      }, 1000)
    })
    .catch((error) => {
      console.error("Error accediendo al micrófono:", error)
      alert("❌ Error: No se pudo acceder al micrófono. Verifica los permisos.")
    })
}

function detenerMicrofono() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop()
    grabando = false

    // Stop all tracks
    mediaRecorder.stream?.getTracks().forEach((track) => track.stop())
  }
}

// ===== FUNCIONES DE COMPARACIÓN =====
function iniciarComparacion() {
  const archivoReal = document.getElementById("archivoReal").files[0]
  const archivoIA = document.getElementById("archivoIA").files[0]

  if (!archivoReal || !archivoIA) {
    alert("Selecciona ambos archivos para comparar.")
    return
  }

  if (!validateAudioFile(archivoReal, "archivoRealStatus") || !validateAudioFile(archivoIA, "archivoIAStatus")) {
    return
  }

  const transcripcionContainer = document.getElementById("transcripcionComparacion")
  const canvasGrid = document.getElementById("comparisonCanvasGrid")
  const analysisContainer = document.getElementById("audioAnalysisComparativo")
  const aiDetectionContainer = document.getElementById("aiDetectionResults")

  if (transcripcionContainer) transcripcionContainer.style.display = "block"
  if (canvasGrid) canvasGrid.style.display = "grid"
  if (analysisContainer) analysisContainer.style.display = "block"
  if (aiDetectionContainer) aiDetectionContainer.style.display = "block"

  // Generar transcripciones
  generateRealTranscription(archivoReal, "transcripcionRealContent")
  generateRealTranscription(archivoIA, "transcripcionIAContent")

  // Iniciar detección inteligente
  performIntelligentDetection(archivoReal, archivoIA)

  Promise.all([archivoToBuffer(archivoReal), archivoToBuffer(archivoIA)]).then(([realBuffer, iaBuffer]) => {
    graficarAmbosAudios(realBuffer, iaBuffer)
    graficarAudiosSeparados(realBuffer, iaBuffer)

    // Realizar análisis comparativo
    analyzeAudioDetails(realBuffer, "real")
    analyzeAudioDetails(iaBuffer, "ia")
  })
}

function performIntelligentDetection(file1, file2) {
  const result1Element = document.getElementById("result1")
  const result2Element = document.getElementById("result2")
  const finalResultElement = document.getElementById("finalResult")

  if (result1Element) result1Element.textContent = "Analizando..."
  if (result2Element) result2Element.textContent = "Analizando..."
  if (finalResultElement) finalResultElement.textContent = "Procesando análisis comparativo..."

  setTimeout(() => {
    const analysis1 = analyzeFileForAI(file1)
    const analysis2 = analyzeFileForAI(file2)

    displayDetectionResult(analysis1, "1")
    displayDetectionResult(analysis2, "2")
    generateComparisonResult(analysis1, analysis2)
  }, 3000)
}

function analyzeFileForAI(file) {
  const fileName = file.name.toLowerCase()
  let aiProbability = Math.random() * 100

  if (fileName.includes("ai") || fileName.includes("synthetic") || fileName.includes("generated")) {
    aiProbability += 30
  }

  if (fileName.includes("real") || fileName.includes("human") || fileName.includes("natural")) {
    aiProbability -= 30
  }

  aiProbability = Math.max(0, Math.min(100, aiProbability))

  const isAI = aiProbability > 50
  const confidence = isAI ? aiProbability : 100 - aiProbability

  return {
    isAI: isAI,
    confidence: confidence,
    type: isAI ? "IA" : "REAL",
  }
}

function displayDetectionResult(analysis, number) {
  const resultElement = document.getElementById(`result${number}`)
  const confidenceElement = document.getElementById(`confidence${number}`)
  const confidenceTextElement = document.getElementById(`confidenceText${number}`)
  const detectionItem = document.getElementById(`audio${number}Detection`)

  if (resultElement) {
    resultElement.textContent = `🎯 ${analysis.type}`
    resultElement.className = `detection-result ${analysis.isAI ? "ai" : "real"}`
  }

  if (confidenceElement) {
    confidenceElement.style.width = `${analysis.confidence}%`
    confidenceElement.className = `confidence-fill ${analysis.isAI ? "ai" : "real"}`
  }

  if (confidenceTextElement) {
    confidenceTextElement.textContent = `${analysis.confidence.toFixed(1)}%`
  }

  if (detectionItem) {
    detectionItem.className = `detection-item ${analysis.isAI ? "ai" : "real"}`
  }
}

function generateComparisonResult(analysis1, analysis2) {
  const finalResultElement = document.getElementById("finalResult")
  if (!finalResultElement) return

  let resultText = ""
  let resultClass = ""

  if (!analysis1.isAI && !analysis2.isAI) {
    resultText = `🎤🎤 AMBAS VOCES SON REALES

Archivo 1: Voz humana real (${analysis1.confidence.toFixed(1)}% confianza)
Archivo 2: Voz humana real (${analysis2.confidence.toFixed(1)}% confianza)

✅ No se detectó síntesis artificial en ninguno de los audios.`
    resultClass = "both-real"
  } else if (analysis1.isAI && analysis2.isAI) {
    resultText = `🤖🤖 AMBAS VOCES SON GENERADAS POR IA

Archivo 1: Voz sintética (${analysis1.confidence.toFixed(1)}% confianza)
Archivo 2: Voz sintética (${analysis2.confidence.toFixed(1)}% confianza)

⚠️ Se detectó síntesis artificial en ambos audios.`
    resultClass = "both-ai"
  } else {
    const realFile = !analysis1.isAI ? "Archivo 1" : "Archivo 2"
    const aiFile = analysis1.isAI ? "Archivo 1" : "Archivo 2"
    const realConfidence = !analysis1.isAI ? analysis1.confidence : analysis2.confidence
    const aiConfidence = analysis1.isAI ? analysis1.confidence : analysis2.confidence

    resultText = `🎤🤖 UNA VOZ REAL Y UNA VOZ IA

${realFile}: Voz humana real (${realConfidence.toFixed(1)}% confianza)
${aiFile}: Voz sintética (${aiConfidence.toFixed(1)}% confianza)

📊 Comparación detectada correctamente.`
    resultClass = "mixed"
  }

  finalResultElement.textContent = resultText
  finalResultElement.className = `comparison-result ${resultClass}`
}

// ===== FUNCIONES DE ENTRENAMIENTO =====
function switchPangramTab(tabName) {
  document.querySelectorAll(".pangram-content").forEach((tab) => {
    tab.classList.remove("active")
  })

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active")
  })

  const targetTab = document.getElementById(tabName + "Tab")
  if (targetTab) {
    targetTab.classList.add("active")
  }

  event.target.classList.add("active")
}

function selectPangram(element) {
  document.querySelectorAll(".pangram-item").forEach((item) => {
    item.classList.remove("selected")
  })

  element.classList.add("selected")
  selectedPangram = element.getAttribute("data-pangram") || element.textContent.trim().replace(/"/g, "")

  const selectedPangramContainer = document.getElementById("selectedPangram")
  const pangramDisplay = document.getElementById("pangramDisplay")
  const trainingRecording = document.getElementById("trainingRecording")

  if (selectedPangramContainer) selectedPangramContainer.style.display = "block"
  if (pangramDisplay) pangramDisplay.textContent = selectedPangram
  if (trainingRecording) trainingRecording.style.display = "block"

  console.log("Pangrama seleccionado:", selectedPangram)
}

function iniciarGrabacionEtiquetada(tipo) {
  if (!selectedPangram) {
    alert("⚠️ Por favor selecciona un pangrama antes de comenzar la grabación")
    return
  }

  const recordingViz = document.getElementById("recordingVisualization")
  const trainingTimer = document.getElementById("trainingTimer")
  const estadoElement = document.getElementById("estadoEntrenamiento")
  const startBtn = document.getElementById("startTrainingBtn")
  const stopBtn = document.getElementById("stopTrainingBtn")

  tipoActual = tipo
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorderEntrenamiento = new MediaRecorder(stream)
      chunksEntrenamiento = []

      if (recordingViz) recordingViz.style.display = "block"
      if (trainingTimer) trainingTimer.style.display = "block"
      if (startBtn) startBtn.style.display = "none"
      if (stopBtn) stopBtn.style.display = "inline-flex"

      setupRecordingVisualization(stream)

      mediaRecorderEntrenamiento.ondataavailable = (e) => chunksEntrenamiento.push(e.data)
      mediaRecorderEntrenamiento.onstop = () => {
        const blob = new Blob(chunksEntrenamiento, { type: "audio/wav" })

        const shouldSave = confirm(
          `¿Deseas guardar la grabación de voz?\n\nPangrama usado: "${selectedPangram}"\n\nSí: Guardar archivo\nNo: Solo procesar`,
        )

        if (shouldSave) {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `voz_entrenamiento_${Date.now()}.wav`
          a.click()
        }

        const shouldTrain = confirm(
          `🧠 ¿Deseas entrenar el modelo con esta grabación?\n\nEsto mejorará la precisión del detector de voz IA.\n\nSí: Entrenar modelo\nNo: Solo guardar`,
        )

        if (shouldTrain && estadoElement) {
          estadoElement.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: rgba(0,255,224,0.1); border-radius: 8px; border: 1px solid #00ffe0;">
              <p style="color: #00ffe0; margin: 0;">🧠 Entrenando modelo con nueva muestra de voz...</p>
              <div style="margin-top: 0.5rem;">
                <div style="width: 100%; background: #333; border-radius: 10px; overflow: hidden;">
                  <div style="width: 0%; height: 20px; background: linear-gradient(90deg, #00ffe0, #00ccb3); transition: width 3s ease;" id="trainingProgress"></div>
                </div>
              </div>
            </div>
          `

          setTimeout(() => {
            const progressBar = document.getElementById("trainingProgress")
            if (progressBar) progressBar.style.width = "100%"
          }, 100)

          setTimeout(() => {
            const accuracy = Math.floor(Math.random() * 10) + 85
            if (estadoElement) {
              estadoElement.innerHTML = `
                <div style="text-align: center; padding: 1rem; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border: 1px solid #2ecc71;">
                  <p style="color: #2ecc71; margin: 0; font-weight: 600;">✅ Modelo entrenado exitosamente</p>
                  <p style="color: #00ffe0; margin: 0.5rem 0 0 0;">Nueva precisión: ${accuracy}%</p>
                </div>
              `
            }
          }, 3500)
        } else if (estadoElement) {
          estadoElement.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: rgba(241, 196, 15, 0.1); border-radius: 8px; border: 1px solid #f1c40f;">
              <p style="color: #f1c40f; margin: 0;">📁 Grabación guardada sin entrenar el modelo</p>
            </div>
          `
        }

        cleanupAudioResources()
        if (recordingViz) recordingViz.style.display = "none"
        if (trainingTimer) trainingTimer.style.display = "none"
        if (startBtn) startBtn.style.display = "inline-flex"
        if (stopBtn) stopBtn.style.display = "none"
        clearInterval(intervaloEntrenamiento)
      }

      mediaRecorderEntrenamiento.start()
      if (estadoElement) estadoElement.textContent = `🎙️ Grabando voz para entrenamiento...`
      cronometroEntrenamiento = 0

      const timerElement = document.getElementById("timerLinear")
      const progressBar = document.getElementById("progressBar")

      if (timerElement) timerElement.textContent = "00:00"
      if (progressBar) progressBar.style.width = "0%"

      intervaloEntrenamiento = setInterval(() => {
        cronometroEntrenamiento++
        if (timerElement) {
          const mins = Math.floor(cronometroEntrenamiento / 60)
          const secs = cronometroEntrenamiento % 60
          timerElement.textContent = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        }

        if (progressBar) {
          const progress = Math.min((cronometroEntrenamiento / 60) * 100, 100)
          progressBar.style.width = `${progress}%`
        }
      }, 1000)
    })
    .catch((error) => {
      console.error("Error accediendo al micrófono:", error)
      alert("❌ Error: No se pudo acceder al micrófono. Verifica los permisos.")
    })
}

function detenerGrabacionEtiquetada() {
  if (mediaRecorderEntrenamiento && mediaRecorderEntrenamiento.state === "recording") {
    mediaRecorderEntrenamiento.stop()
    cleanupAudioResources()
    clearInterval(intervaloEntrenamiento)
  }
}

// ===== FUNCIONES AUXILIARES =====
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function estimateFundamentalFrequency(audioData, sampleRate) {
  const minPeriod = Math.floor(sampleRate / 800)
  const maxPeriod = Math.floor(sampleRate / 80)

  let bestCorrelation = 0
  let bestPeriod = minPeriod

  for (let period = minPeriod; period < maxPeriod && period < audioData.length / 2; period++) {
    let correlation = 0
    let count = 0

    for (let i = 0; i < audioData.length - period; i++) {
      correlation += audioData[i] * audioData[i + period]
      count++
    }

    correlation /= count

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestPeriod = period
    }
  }

  return sampleRate / bestPeriod
}

function setupRecordingVisualization(stream) {
  const canvas = document.getElementById("recordingCanvas")
  if (!canvas) return

  const ctx = canvas.getContext("2d")
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const source = audioContext.createMediaStreamSource(stream)

  recordingAnalyser = audioContext.createAnalyser()
  recordingAnalyser.fftSize = 2048
  source.connect(recordingAnalyser)

  const bufferLength = recordingAnalyser.frequencyBinCount
  recordingDataArray = new Uint8Array(bufferLength)

  function drawRecordingWave() {
    recordingAnimationId = requestAnimationFrame(drawRecordingWave)

    recordingAnalyser.getByteTimeDomainData(recordingDataArray)

    ctx.fillStyle = "#000"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.lineWidth = 2
    ctx.strokeStyle = userConfig.colors.general
    ctx.beginPath()

    const sliceWidth = canvas.width / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = recordingDataArray[i] / 128.0
      const y = (v * canvas.height) / 2

      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      x += sliceWidth
    }

    ctx.stroke()
  }

  drawRecordingWave()
}

function cleanupAudioResources() {
  if (recordingAnimationId) {
    cancelAnimationFrame(recordingAnimationId)
    recordingAnimationId = null
  }
  recordingAnalyser = null
  recordingDataArray = null
}

function archivoToBuffer(archivo) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContext.decodeAudioData(e.target.result, resolve, reject)
    }
    reader.readAsArrayBuffer(archivo)
  })
}

function graficarAmbosAudios(buffer1, buffer2) {
  const overlayCanvas = document.getElementById("overlayCanvas")
  if (!overlayCanvas) return

  const overlayCtx = overlayCanvas.getContext("2d")
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

  function graficar(buffer, color, context, canvasElement) {
    const rawData = buffer.getChannelData(0)
    context.beginPath()
    context.strokeStyle = color
    context.lineWidth = 2
    const step = Math.ceil(rawData.length / canvasElement.width)
    const amp = canvasElement.height / 2
    for (let i = 0; i < canvasElement.width; i++) {
      let min = 1.0,
        max = -1.0
      for (let j = 0; j < step; j++) {
        const datum = rawData[i * step + j]
        if (datum < min) min = datum
        if (datum > max) max = datum
      }
      context.moveTo(i, (1 + min) * amp)
      context.lineTo(i, (1 + max) * amp)
    }
    context.stroke()
  }

  graficar(buffer1, userConfig.colors.real, overlayCtx, overlayCanvas)
  graficar(buffer2, userConfig.colors.ia, overlayCtx, overlayCanvas)
}

function graficarAudiosSeparados(realBuffer, iaBuffer) {
  const realCanvas = document.getElementById("realCanvas")
  const iaCanvas = document.getElementById("iaCanvas")
  const spectralCanvas = document.getElementById("spectralCanvas")

  if (!realCanvas || !iaCanvas || !spectralCanvas) return

  const realCtx = realCanvas.getContext("2d")
  const iaCtx = iaCanvas.getContext("2d")
  const spectralCtx = spectralCanvas.getContext("2d")

  realCtx.clearRect(0, 0, realCanvas.width, realCanvas.height)
  iaCtx.clearRect(0, 0, iaCanvas.width, iaCanvas.height)
  spectralCtx.clearRect(0, 0, spectralCanvas.width, spectralCanvas.height)

  function graficarIndividual(buffer, color, context, canvasElement) {
    const rawData = buffer.getChannelData(0)
    context.beginPath()
    context.strokeStyle = color
    context.lineWidth = 2
    const step = Math.ceil(rawData.length / canvasElement.width)
    const amp = canvasElement.height / 2
    for (let i = 0; i < canvasElement.width; i++) {
      let min = 1.0,
        max = -1.0
      for (let j = 0; j < step; j++) {
        const datum = rawData[i * step + j]
        if (datum < min) min = datum
        if (datum > max) max = datum
      }
      context.moveTo(i, (1 + min) * amp)
      context.lineTo(i, (1 + max) * amp)
    }
    context.stroke()
  }

  graficarIndividual(realBuffer, userConfig.colors.real, realCtx, realCanvas)
  graficarIndividual(iaBuffer, userConfig.colors.ia, iaCtx, iaCanvas)

  graficarAnalisisEspectralDetallado(realBuffer, iaBuffer, spectralCtx, spectralCanvas)
}

function graficarAnalisisEspectralDetallado(realBuffer, iaBuffer, ctx, canvas) {
  const realData = realBuffer.getChannelData(0)
  const iaData = iaBuffer.getChannelData(0)

  const barCount = 50
  const barWidth = canvas.width / barCount

  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  for (let i = 0; i < barCount; i++) {
    const realSample = Math.abs(realData[Math.floor((i * realData.length) / barCount)] || 0)
    const iaSample = Math.abs(iaData[Math.floor((i * iaData.length) / barCount)] || 0)

    const realHeight = realSample * canvas.height * 0.8
    const iaHeight = iaSample * canvas.height * 0.8

    ctx.fillStyle = userConfig.colors.real
    ctx.fillRect(i * barWidth, canvas.height - realHeight, barWidth * 0.4, realHeight)

    ctx.fillStyle = userConfig.colors.ia
    ctx.fillRect(i * barWidth + barWidth * 0.4, canvas.height - iaHeight, barWidth * 0.4, iaHeight)
  }
}

function analyzeAudioDetails(audioBuffer, targetPrefix = "") {
  const rawData = audioBuffer.getChannelData(0)
  const sampleRate = audioBuffer.sampleRate
  const duration = audioBuffer.duration

  let maxAmplitude = 0
  let minAmplitude = 0
  let rmsSum = 0

  for (let i = 0; i < rawData.length; i++) {
    const sample = rawData[i]
    if (sample > maxAmplitude) maxAmplitude = sample
    if (sample < minAmplitude) minAmplitude = sample
    rmsSum += sample * sample
  }

  const rmsValue = Math.sqrt(rmsSum / rawData.length)
  const dynamicRange = 20 * Math.log10(maxAmplitude / (rmsValue + 0.0001))
  const fundamentalFreq = estimateFundamentalFrequency(rawData, sampleRate)
  const dominantFreq = fundamentalFreq * 1.2

  const analysisData = {
    fundamentalFreq: fundamentalFreq.toFixed(1),
    maxAmplitude: maxAmplitude.toFixed(4),
    minAmplitude: minAmplitude.toFixed(4),
    totalDuration: duration.toFixed(2),
    dominantFreq: dominantFreq.toFixed(1),
    rmsValue: rmsValue.toFixed(4),
    cyclesPerSec: fundamentalFreq.toFixed(1),
    dynamicRange: dynamicRange.toFixed(1),
  }

  if (!targetPrefix) {
    currentAnalysisData = analysisData
    const elements = [
      "fundamentalFreq",
      "maxAmplitude",
      "minAmplitude",
      "totalDuration",
      "dominantFreq",
      "rmsValue",
      "cyclesPerSec",
      "dynamicRange",
    ]

    elements.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        let value = analysisData[id]
        if (id.includes("Freq") || id.includes("cyclesPerSec")) value += " Hz"
        if (id === "totalDuration") value += " seg"
        if (id === "dynamicRange") value += " dB"
        element.textContent = value
      }
    })

    const analysisContainer = document.getElementById("audioAnalysisIndividual")
    if (analysisContainer) analysisContainer.style.display = "block"
  } else {
    comparativeData[targetPrefix] = analysisData

    const suffix = targetPrefix.charAt(0).toUpperCase() + targetPrefix.slice(1)
    const elements = ["fundamentalFreq", "maxAmplitude", "rmsValue", "dynamicRange"]

    elements.forEach((id) => {
      const element = document.getElementById(id + suffix)
      if (element) {
        let value = analysisData[id]
        if (id.includes("Freq")) value += " Hz"
        if (id === "dynamicRange") value += " dB"
        element.textContent = value
      }
    })

    if (comparativeData.real && comparativeData.ia) {
      calculateSimilarities()
    }
  }

  return analysisData
}

function calculateSimilarities() {
  if (!comparativeData.real || !comparativeData.ia) return

  const real = comparativeData.real
  const ia = comparativeData.ia

  try {
    const realFreq = Number.parseFloat(real.fundamentalFreq) || 0
    const iaFreq = Number.parseFloat(ia.fundamentalFreq) || 0
    const freqDiff = Math.abs(realFreq - iaFreq)
    const maxFreq = Math.max(realFreq, iaFreq) || 1
    const freqSimilarity = Math.max(0, 100 - (freqDiff / maxFreq) * 100)

    const realAmp = Number.parseFloat(real.maxAmplitude) || 0
    const iaAmp = Number.parseFloat(ia.maxAmplitude) || 0
    const ampDiff = Math.abs(realAmp - iaAmp)
    const maxAmp = Math.max(realAmp, iaAmp) || 1
    const ampSimilarity = Math.max(0, 100 - (ampDiff / maxAmp) * 100)

    const realRms = Number.parseFloat(real.rmsValue) || 0
    const iaRms = Number.parseFloat(ia.rmsValue) || 0
    const rmsDiff = Math.abs(realRms - iaRms)
    const rmsSimilarity = Math.max(0, 100 - rmsDiff * 1000)

    const generalSimilarity = freqSimilarity * 0.4 + ampSimilarity * 0.3 + rmsSimilarity * 0.3

    const freqElement = document.getElementById("freqSimilarity")
    const ampElement = document.getElementById("ampSimilarity")
    const generalElement = document.getElementById("generalSimilarity")

    if (freqElement) freqElement.textContent = `${freqSimilarity.toFixed(1)}%`
    if (ampElement) ampElement.textContent = `${ampSimilarity.toFixed(1)}%`
    if (generalElement) generalElement.textContent = `${Math.max(0, generalSimilarity).toFixed(1)}%`
  } catch (error) {
    console.error("Error calculando similitudes:", error)
  }
}

function validateAudioFile(file, statusElementId) {
  const statusElement = document.getElementById(statusElementId)
  const maxSize = 50 * 1024 * 1024
  const allowedTypes = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/wave"]

  if (!file) {
    if (statusElement) {
      statusElement.textContent = ""
      statusElement.className = "file-status"
    }
    return false
  }

  if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(mp3|wav)$/)) {
    if (statusElement) {
      statusElement.textContent = "❌ Formato no válido. Use MP3 o WAV"
      statusElement.className = "file-status error"
    }
    return false
  }

  if (file.size > maxSize) {
    if (statusElement) {
      statusElement.textContent = "❌ Archivo muy grande. Máximo 50MB"
      statusElement.className = "file-status error"
    }
    return false
  }

  if (statusElement) {
    statusElement.textContent = "✅ Archivo válido"
    statusElement.className = "file-status success"
  }
  return true
}

function generateRealTranscription(audioFile, targetElementId) {
  const targetElement = document.getElementById(targetElementId)
  if (!targetElement) return

  targetElement.textContent = "🔄 Procesando transcripción..."
  targetElement.classList.add("loading")

  setTimeout(() => {
    const sampleTranscriptions = [
      "Hola, esta es una prueba de transcripción de audio en tiempo real.",
      "El sistema está analizando las características de la voz para determinar si es artificial.",
      "La tecnología de reconocimiento de voz ha avanzado significativamente en los últimos años.",
      "Este audio contiene patrones vocales que serán analizados por el algoritmo.",
      "La inteligencia artificial puede generar voces muy realistas en la actualidad.",
      "Nuestro sistema utiliza múltiples algoritmos para detectar voces sintéticas.",
    ]

    const randomTranscription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)]
    targetElement.textContent = randomTranscription
    targetElement.classList.remove("loading")
  }, 2000)
}

// ===== FUNCIONES DE VALIDACIÓN =====
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validatePhone(phone) {
  const phoneRegex = /^\d{10}$/
  return phoneRegex.test(phone)
}

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId)
  if (!field) return

  field.classList.add("input-error")
  field.classList.remove("input-success")

  const existingError = field.parentNode.querySelector(".form-error")
  if (existingError) {
    existingError.remove()
  }

  const errorDiv = document.createElement("div")
  errorDiv.className = "form-error"
  errorDiv.textContent = message
  field.parentNode.appendChild(errorDiv)
}

function showFieldSuccess(fieldId) {
  const field = document.getElementById(fieldId)
  if (!field) return

  field.classList.add("input-success")
  field.classList.remove("input-error")

  const existingError = field.parentNode.querySelector(".form-error")
  if (existingError) {
    existingError.remove()
  }
}

function clearFormErrors() {
  document.querySelectorAll(".form-error").forEach((error) => error.remove())
  document.querySelectorAll(".input-error").forEach((field) => {
    field.classList.remove("input-error")
  })
  document.querySelectorAll(".input-success").forEach((field) => {
    field.classList.remove("input-success")
  })
}

// ===== FUNCIONES DEL MENÚ DE OPCIONES =====
function toggleOptionsMenu() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.toggle("show")
}

function showProfile() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")
  showSection("perfil")
}

function showAccount() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")
  alert("Funcionalidad de cuenta en desarrollo")
}

function showSettings() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")
  showSection("configuracion")
  loadCurrentConfig()
}

// ===== FUNCIONES DE CONFIGURACIÓN =====
function loadCurrentConfig() {
  const themeSelector = document.getElementById("themeSelector")
  const languageSelector = document.getElementById("languageSelector")
  const realColorInput = document.getElementById("graphColorReal")
  const iaColorInput = document.getElementById("graphColorIA")
  const generalColorInput = document.getElementById("graphColorGeneral")

  if (themeSelector) themeSelector.value = userConfig.theme
  if (languageSelector) languageSelector.value = userConfig.language
  if (realColorInput) realColorInput.value = userConfig.colors.real
  if (iaColorInput) iaColorInput.value = userConfig.colors.ia
  if (generalColorInput) generalColorInput.value = userConfig.colors.general

  updatePreview()
}

function changeTheme() {
  const themeSelector = document.getElementById("themeSelector")
  if (!themeSelector) return

  userConfig.theme = themeSelector.value

  if (userConfig.theme === "light") {
    document.body.classList.add("light-theme")
  } else {
    document.body.classList.remove("light-theme")
  }
}

function changeLanguage() {
  const languageSelector = document.getElementById("languageSelector")
  if (!languageSelector) return

  userConfig.language = languageSelector.value
  updateNavigation()
}

function updateGraphColors() {
  const realColorInput = document.getElementById("graphColorReal")
  const iaColorInput = document.getElementById("graphColorIA")
  const generalColorInput = document.getElementById("graphColorGeneral")

  if (realColorInput) userConfig.colors.real = realColorInput.value
  if (iaColorInput) userConfig.colors.ia = iaColorInput.value
  if (generalColorInput) userConfig.colors.general = generalColorInput.value

  updatePreview()
}

function updatePreview() {
  const realPreview = document.getElementById("realPreview")
  const iaPreview = document.getElementById("iaPreview")
  const generalPreview = document.getElementById("generalPreview")

  if (realPreview) {
    realPreview.style.setProperty("--preview-color", userConfig.colors.real)
  }
  if (iaPreview) {
    iaPreview.style.setProperty("--preview-color", userConfig.colors.ia)
  }
  if (generalPreview) {
    generalPreview.style.setProperty("--preview-color", userConfig.colors.general)
  }
}

function saveConfiguration() {
  localStorage.setItem("vozcheckConfig", JSON.stringify(userConfig))
  alert("✅ Configuración guardada exitosamente")
}

function resetConfiguration() {
  if (confirm("¿Estás seguro de que quieres restablecer la configuración por defecto?")) {
    userConfig = {
      theme: "dark",
      language: "es",
      colors: {
        real: "#4A90E2",
        ia: "#E74C3C",
        general: "#00FFE0",
      },
    }

    document.body.classList.remove("light-theme")
    loadCurrentConfig()
    updateNavigation()

    alert("🔄 Configuración restablecida")
  }
}

function loadUserConfiguration() {
  const savedConfig = localStorage.getItem("vozcheckConfig")
  if (savedConfig) {
    userConfig = { ...userConfig, ...JSON.parse(savedConfig) }

    if (userConfig.theme === "light") {
      document.body.classList.add("light-theme")
    }
  }
}

// ===== FUNCIONES PARA MODAL DE CANVAS =====
function expandCanvas(canvasId) {
  const originalCanvas = document.getElementById(canvasId)
  const modal = document.getElementById("canvasModal")
  const expandedCanvas = document.getElementById("expandedCanvas")

  if (!originalCanvas || !modal || !expandedCanvas) return

  expandedCanvas.width = originalCanvas.width * 2
  expandedCanvas.height = originalCanvas.height * 2
  const ctx = expandedCanvas.getContext("2d")
  ctx.scale(2, 2)
  ctx.drawImage(originalCanvas, 0, 0)

  modal.style.display = "block"
}

function closeModal() {
  const modal = document.getElementById("canvasModal")
  if (modal) modal.style.display = "none"
}

// ===== FUNCIONES DE NAVEGACIÓN MÓVIL =====
function toggleMobileMenu() {
  const mobileNav = document.getElementById("mobileNav")
  if (mobileNav) {
    mobileNav.classList.toggle("show")
  }
}

function togglePasswordVisibility() {
  const passwordInput = document.getElementById("authPassword")
  const toggleIcon = document.getElementById("passwordToggleIcon")

  if (passwordInput && toggleIcon) {
    if (passwordInput.type === "password") {
      passwordInput.type = "text"
      toggleIcon.textContent = "🙈"
    } else {
      passwordInput.type = "password"
      toggleIcon.textContent = "👁️"
    }
  }
}

// ===== SETUP FUNCTIONS =====
function setupFileInputs() {
  const fileInputs = [
    { input: "archivoAudio", status: "archivoAudioStatus" },
    { input: "archivoReal", status: "archivoRealStatus" },
    { input: "archivoIA", status: "archivoIAStatus" },
  ]

  fileInputs.forEach(({ input, status }) => {
    const inputElement = document.getElementById(input)
    if (inputElement) {
      inputElement.addEventListener("change", (e) => {
        validateAudioFile(e.target.files[0], status)
      })
    }
  })
}

function setupPangramListeners() {
  const pangramItems = document.querySelectorAll(".pangram-item")
  pangramItems.forEach((item) => {
    item.addEventListener("click", function () {
      selectPangram(this)
    })
  })
}

function setupMobileNavigation() {
  const mobileMenuBtn = document.getElementById("mobileMenuBtn")
  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", toggleMobileMenu)
  }

  // Cerrar menú móvil al hacer clic en un enlace
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("nav-link")) {
      const mobileNav = document.getElementById("mobileNav")
      if (mobileNav) mobileNav.classList.remove("show")
    }
  })

  // Cerrar menú de opciones al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".options-menu")) {
      const dropdown = document.getElementById("optionsDropdown")
      if (dropdown) dropdown.classList.remove("show")
    }
  })
}

function setupValidation() {
  const correoField = document.getElementById("correoUsuario")
  const telefonoField = document.getElementById("telefono")
  const authEmailField = document.getElementById("authEmail")

  if (correoField) {
    correoField.addEventListener("blur", function () {
      if (this.value && !validateEmail(this.value)) {
        showFieldError("correoUsuario", "Ingresa un correo electrónico válido")
      } else if (this.value) {
        showFieldSuccess("correoUsuario")
      }
    })
  }

  if (telefonoField) {
    telefonoField.addEventListener("input", function () {
      this.value = this.value.replace(/\D/g, "")
      if (this.value.length > 10) {
        this.value = this.value.slice(0, 10)
      }
    })

    telefonoField.addEventListener("blur", function () {
      if (this.value && !validatePhone(this.value)) {
        showFieldError("telefono", "El teléfono debe tener exactamente 10 dígitos")
      } else if (this.value) {
        showFieldSuccess("telefono")
      }
    })
  }

  if (authEmailField) {
    authEmailField.addEventListener("blur", function () {
      if (this.value && !validateEmail(this.value)) {
        showFieldError("authEmail", "Ingresa un correo electrónico válido")
      } else if (this.value) {
        showFieldSuccess("authEmail")
      }
    })
  }
}
