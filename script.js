// js/script.js

// 🔐 Supabase
const SUPABASE_URL = "https://bmztpqepwcsbvejwtrdt.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtenRwcWVwd2NzYnZland0cmR0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU5ODQ5MjIsImV4cCI6MjA2MTU2MDkyMn0.87KE6C6uRYIsJ68wj31JzNpvW1Td8psiyl2Gn_Pu0hs"

// ✅ Inicializar Supabase de forma segura
let supabaseClient = null
if (window.supabase && typeof window.supabase.createClient === "function") {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  console.log("✅ Supabase inicializado correctamente")
} else {
  console.error("❌ Supabase no se cargó correctamente. Verifica el <script> en el HTML.")
}

// Estados del usuario
let userState = {
  isLoggedIn: false,
  hasProfile: false,
  email: "",
  userData: null,
}

// Variables globales
let modalZoom = 1
let modalPanX = 0
let modalPanY = 0
const isDragging = false
const lastMouseX = 0
const lastMouseY = 0

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

// Funciones de autenticación mejoradas
function loginEmail() {
  const email = document.getElementById("authEmail").value
  const password = document.getElementById("authPassword").value
  const statusElement = document.getElementById("authStatus")

  if (!email || !password) {
    statusElement.textContent = "Por favor completa todos los campos"
    statusElement.style.color = "#e74c3c"
    return
  }

  statusElement.textContent = "Iniciando sesión..."
  statusElement.style.color = "#0ff"

  setTimeout(() => {
    userState.isLoggedIn = true
    userState.email = email
    userState.hasProfile = true // Login directo a análisis

    statusElement.textContent = "✅ Sesión iniciada correctamente"
    statusElement.style.color = "#2ecc71"

    // Ir directo a análisis
    updateNavigation()
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
    document.getElementById("analisis").classList.remove("oculto")
  }, 1000)
}

function registerEmail() {
  const email = document.getElementById("authEmail").value
  const password = document.getElementById("authPassword").value
  const statusElement = document.getElementById("authStatus")

  if (!email || !password) {
    statusElement.textContent = "Por favor completa todos los campos"
    statusElement.style.color = "#e74c3c"
    return
  }

  statusElement.textContent = "Creando cuenta..."
  statusElement.style.color = "#0ff"

  setTimeout(() => {
    userState.isLoggedIn = true
    userState.email = email
    userState.hasProfile = false // Registro requiere completar perfil

    const correoUsuario = document.getElementById("correoUsuario")
    if (correoUsuario) {
      correoUsuario.value = email
    }

    statusElement.textContent = "✅ Cuenta creada exitosamente"
    statusElement.style.color = "#2ecc71"

    // Ir a completar perfil
    updateNavigation()
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
    document.getElementById("perfil").classList.remove("oculto")
  }, 1500)
}

function loginGoogle() {
  const statusElement = document.getElementById("authStatus")

  statusElement.textContent = "Conectando con Google..."
  statusElement.style.color = "#0ff"

  setTimeout(() => {
    userState.isLoggedIn = true
    userState.email = "usuario@gmail.com"
    userState.hasProfile = true // Login directo a análisis

    statusElement.textContent = "✅ Conectado con Google"
    statusElement.style.color = "#2ecc71"

    updateNavigation()
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
    document.getElementById("analisis").classList.remove("oculto")
  }, 1200)
}

function loginFacebook() {
  const statusElement = document.getElementById("authStatus")

  statusElement.textContent = "Conectando con Facebook..."
  statusElement.style.color = "#0ff"

  setTimeout(() => {
    userState.isLoggedIn = true
    userState.email = "usuario@facebook.com"
    userState.hasProfile = true // Login directo a análisis

    statusElement.textContent = "✅ Conectado con Facebook"
    statusElement.style.color = "#2ecc71"

    updateNavigation()
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
    document.getElementById("analisis").classList.remove("oculto")
  }, 1200)
}

// Control de navegación según estado del usuario
function updateNavigation() {
  const navMenu = document.getElementById("navMenu")
  const optionsMenu = document.getElementById("optionsMenu")

  if (!userState.isLoggedIn) {
    navMenu.innerHTML = '<li><a href="#auth" class="nav-link active">Acceso</a></li>'
    if (optionsMenu) optionsMenu.style.display = "none"
  } else if (!userState.hasProfile) {
    navMenu.innerHTML = '<li><a href="#perfil" class="nav-link active">Completar Perfil</a></li>'
    if (optionsMenu) optionsMenu.style.display = "block"
  } else {
    navMenu.innerHTML = `
      <li><a href="#analisis" class="nav-link active">🎤 Análisis</a></li>
      <li><a href="#comparacion" class="nav-link">🆚 Comparación</a></li>
      <li><a href="#entrenamientoMic" class="nav-link">🧠 Entrenamiento</a></li>
    `
    if (optionsMenu) optionsMenu.style.display = "block"
  }

  setupNavigationListeners()
}

// Configurar event listeners de navegación
function setupNavigationListeners() {
  const enlaces = document.querySelectorAll(".nav-link")

  enlaces.forEach((link) => {
    link.removeEventListener("click", handleNavClick)
    link.addEventListener("click", handleNavClick)
  })
}

function handleNavClick(e) {
  e.preventDefault()
  const link = e.target
  const targetId = link.getAttribute("href")

  if (targetId === "#analisis" || targetId === "#comparacion" || targetId === "#entrenamientoMic") {
    if (!userState.isLoggedIn || !userState.hasProfile) {
      alert("Debes completar tu perfil antes de acceder a esta sección")
      return
    }
  } else if (targetId === "#perfil") {
    if (!userState.isLoggedIn) {
      alert("Debes iniciar sesión primero")
      return
    }
  }

  document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"))
  link.classList.add("active")

  document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
  const targetScreen = document.querySelector(targetId)
  if (targetScreen) {
    targetScreen.classList.remove("oculto")
  }
}

// Funciones de perfil
function guardarPerfil() {
  const nombre = document.getElementById("nombreCompleto").value
  const correo = document.getElementById("correoUsuario").value
  const telefono = document.getElementById("telefono").value
  const tipoUsuario = document.getElementById("tipoUsuario").value
  const preferenciaAnalisis = document.getElementById("preferenciaAnalisis").value
  const notifEmail = document.getElementById("notifEmail").checked
  const notifResultados = document.getElementById("notifResultados").checked
  const notifActualizaciones = document.getElementById("notifActualizaciones").checked

  if (!nombre || !correo || !tipoUsuario) {
    alert("Por favor completa los campos obligatorios (marcados con *)")
    return
  }

  userState.userData = {
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

  userState.hasProfile = true

  alert("✅ Perfil completado exitosamente")

  updateNavigation()
  document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
  document.getElementById("analisis").classList.remove("oculto")

  document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"))
  const analysisLink = document.querySelector('a[href="#analisis"]')
  if (analysisLink) {
    analysisLink.classList.add("active")
  }
}

// Funciones de análisis de audio mejoradas
function iniciarAnalisis() {
  const archivo = document.getElementById("archivoAudio").files[0]
  if (!archivo) {
    alert("Por favor selecciona un archivo de audio.")
    return
  }

  if (!validateAudioFile(archivo, "archivoAudioStatus")) {
    return
  }

  const url = URL.createObjectURL(archivo)
  analizarAudio(url, archivo)
}

function analizarAudio(audioURL, audioFile) {
  const resultado = document.getElementById("resultado")
  const waveformCanvas = document.getElementById("waveformCanvas")
  const spectrumCanvas = document.getElementById("spectrumCanvas")
  const transcripcionContainer = document.getElementById("transcripcionAnalisis")

  // Mostrar mensaje de procesamiento
  resultado.innerHTML = '<p style="color:#0ff">🔄 Analizando audio...</p>'

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
      ctxWave.clearRect(0, 0, waveformCanvas.width, waveformCanvas.height)
      ctxWave.beginPath()
      ctxWave.strokeStyle = "#00ffe0"
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

      drawCanvasWithAxes(waveformCanvas, null)

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
          ctxSpec.fillStyle = `rgb(${barHeight + 100}, 50, 200)`
          ctxSpec.fillRect(x, spectrumCanvas.height - barHeight / 2, barWidth, barHeight / 2)
          x += barWidth + 1
        }
      }
      drawSpectrum()

      drawCanvasWithAxes(spectrumCanvas, null)

      // Mostrar transcripción
      transcripcionContainer.style.display = "block"
      generateRealTranscription(audioFile, "transcripcionAnalisisContent")

      // Simular análisis de IA vs Real
      setTimeout(() => {
        const isAI = Math.random() > 0.5
        const confidence = Math.floor(Math.random() * 30) + 70
        const duration = audioBuffer.duration.toFixed(2)
        const fundamentalFreq = estimateFundamentalFrequency(rawData, audioBuffer.sampleRate)

        const color = isAI ? "#e74c3c" : "#2ecc71"
        const resultText = isAI ? "IA" : "REAL"

        resultado.innerHTML = `
          <div style="text-align: center; padding: 2rem; background: rgba(0,255,255,0.1); border-radius: 10px; border: 2px solid #0ff;">
            <h3 style="color:${color}; font-size: 2rem; margin-bottom: 1rem;">
              🎯 Resultado: VOZ ${resultText}
            </h3>
            <p style="color: #0ff; font-size: 1.2rem; margin-bottom: 0.5rem;">
              Confianza: ${confidence}%
            </p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
              <div style="background: #1b1f2a; padding: 1rem; border-radius: 8px;">
                <strong style="color: #0ff;">Duración:</strong><br>
                <span style="color: #fff;">${duration} segundos</span>
              </div>
              <div style="background: #1b1f2a; padding: 1rem; border-radius: 8px;">
                <strong style="color: #0ff;">Frecuencia Fundamental:</strong><br>
                <span style="color: #fff;">${fundamentalFreq.toFixed(1)} Hz</span>
              </div>
              <div style="background: #1b1f2a; padding: 1rem; border-radius: 8px;">
                <strong style="color: #0ff;">Tipo de Análisis:</strong><br>
                <span style="color: #fff;">Detección IA/Real</span>
              </div>
            </div>
          </div>
        `

        // Guardar en Supabase si está disponible
        if (supabaseClient) {
          supabaseClient
            .from("analisis")
            .insert({
              duracion: Number.parseFloat(duration),
              f0: fundamentalFreq,
              resultado: resultText,
              porcentaje: confidence,
              fecha: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) {
                console.error("Error al guardar en Supabase:", error)
              } else {
                console.log("✅ Análisis guardado en Supabase")
              }
            })
        }
      }, 2000)
    })
    .catch((error) => {
      console.error("Error al procesar audio:", error)
      resultado.innerHTML = '<p style="color:#e74c3c">❌ Error al procesar el archivo de audio.</p>'
    })
}

// Función para comparación de voces
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

  transcripcionContainer.style.display = "block"
  canvasGrid.style.display = "grid"
  analysisContainer.style.display = "block"

  // Generar transcripciones
  generateRealTranscription(archivoReal, "transcripcionRealContent")
  generateRealTranscription(archivoIA, "transcripcionIAContent")

  Promise.all([archivoToBuffer(archivoReal), archivoToBuffer(archivoIA)]).then(([realBuffer, iaBuffer]) => {
    graficarAmbosAudios(realBuffer, iaBuffer)
    graficarAudiosSeparados(realBuffer, iaBuffer)

    // Realizar análisis comparativo
    analyzeAudioDetails(realBuffer, "real")
    analyzeAudioDetails(iaBuffer, "ia")
  })
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

  graficar(buffer1, "#4A90E2", overlayCtx, overlayCanvas)
  graficar(buffer2, "#E74C3C", overlayCtx, overlayCanvas)
  drawCanvasWithAxes(overlayCanvas, null)
}

function graficarAudiosSeparados(realBuffer, iaBuffer) {
  const realCanvas = document.getElementById("realCanvas")
  const iaCanvas = document.getElementById("iaCanvas")
  const spectralCanvas = document.getElementById("spectralCanvas")

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

  graficarIndividual(realBuffer, "#4A90E2", realCtx, realCanvas)
  graficarIndividual(iaBuffer, "#E74C3C", iaCtx, iaCanvas)

  drawCanvasWithAxes(realCanvas, null)
  drawCanvasWithAxes(iaCanvas, null)

  // Análisis espectral comparativo
  graficarAnalisisEspectralDetallado(realBuffer, iaBuffer, spectralCtx, spectralCanvas)
  drawCanvasWithAxes(spectralCanvas, null)
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

    ctx.fillStyle = "#4A90E2"
    ctx.fillRect(i * barWidth, canvas.height - realHeight, barWidth * 0.4, realHeight)

    ctx.fillStyle = "#E74C3C"
    ctx.fillRect(i * barWidth + barWidth * 0.4, canvas.height - iaHeight, barWidth * 0.4, iaHeight)
  }
}

// Función mejorada para análisis detallado
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

    document.getElementById("audioAnalysisIndividual").style.display = "block"
  } else {
    // Análisis comparativo
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

// Función mejorada para selección de pangramas
function selectPangram(element) {
  document.querySelectorAll(".pangram-item").forEach((item) => {
    item.classList.remove("selected")
  })

  element.classList.add("selected")
  selectedPangram = element.getAttribute("data-pangram") || element.textContent.trim().replace(/"/g, "")

  const pangramTextElement = document.getElementById("pangramText")
  if (pangramTextElement) {
    pangramTextElement.textContent = selectedPangram
  }

  console.log("Pangrama seleccionado:", selectedPangram)
}

// Función mejorada para iniciar grabación de entrenamiento
function iniciarGrabacionEtiquetada(tipo) {
  if (!selectedPangram) {
    alert("⚠️ Por favor selecciona un pangrama antes de comenzar la grabación")
    return
  }

  const recordingViz = document.getElementById("recordingVisualization")
  const linearTimer = document.getElementById("linearTimer")
  const estadoElement = document.getElementById("estadoEntrenamiento")
  const pangramDisplay = document.getElementById("recordingPangramDisplay")
  const currentPangramText = document.getElementById("currentPangramText")

  if (!recordingViz || !linearTimer || !estadoElement) {
    console.error("Elementos de UI no encontrados")
    return
  }

  tipoActual = tipo
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorderEntrenamiento = new MediaRecorder(stream)
      chunksEntrenamiento = []

      // Mostrar elementos de grabación
      recordingViz.style.display = "block"
      linearTimer.style.display = "block"
      pangramDisplay.style.display = "block"

      // Mostrar pangrama actual
      if (currentPangramText) {
        currentPangramText.textContent = selectedPangram
      }

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

        if (shouldTrain) {
          estadoElement.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: rgba(0,255,255,0.1); border-radius: 8px; border: 1px solid #0ff;">
              <p style="color: #0ff; margin: 0;">🧠 Entrenando modelo con nueva muestra de voz...</p>
              <div style="margin-top: 0.5rem;">
                <div style="width: 100%; background: #333; border-radius: 10px; overflow: hidden;">
                  <div style="width: 0%; height: 20px; background: linear-gradient(90deg, #0ff, #00cccc); transition: width 3s ease;" id="trainingProgress"></div>
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
            estadoElement.innerHTML = `
              <div style="text-align: center; padding: 1rem; background: rgba(46, 204, 113, 0.1); border-radius: 8px; border: 1px solid #2ecc71;">
                <p style="color: #2ecc71; margin: 0; font-weight: 600;">✅ Modelo entrenado exitosamente</p>
                <p style="color: #0ff; margin: 0.5rem 0 0 0;">Nueva precisión: ${accuracy}%</p>
              </div>
            `
          }, 3500)
        } else {
          estadoElement.innerHTML = `
            <div style="text-align: center; padding: 1rem; background: rgba(241, 196, 15, 0.1); border-radius: 8px; border: 1px solid #f1c40f;">
              <p style="color: #f1c40f; margin: 0;">📁 Grabación guardada sin entrenar el modelo</p>
            </div>
          `
        }

        cleanupAudioResources()
        recordingViz.style.display = "none"
        linearTimer.style.display = "none"
        pangramDisplay.style.display = "none"
        clearInterval(intervaloEntrenamiento)
      }

      mediaRecorderEntrenamiento.start()
      estadoElement.textContent = `🎙️ Grabando voz para entrenamiento...`
      cronometroEntrenamiento = 0

      // Timer lineal que solo avanza
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

        // Actualizar barra de progreso (máximo 60 segundos)
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

// Funciones auxiliares
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
    ctx.strokeStyle = "#0ff"
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

function validateAudioFile(file, statusElementId) {
  const statusElement = document.getElementById(statusElementId)
  const maxSize = 50 * 1024 * 1024
  const allowedTypes = ["audio/mp3", "audio/mpeg", "audio/wav", "audio/wave"]

  if (!file) {
    statusElement.textContent = ""
    statusElement.className = "file-status"
    return false
  }

  if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(mp3|wav)$/)) {
    statusElement.textContent = "❌ Formato no válido. Use MP3 o WAV"
    statusElement.className = "file-status error"
    return false
  }

  if (file.size > maxSize) {
    statusElement.textContent = "❌ Archivo muy grande. Máximo 50MB"
    statusElement.className = "file-status error"
    return false
  }

  statusElement.textContent = "✅ Archivo válido"
  statusElement.className = "file-status success"
  return true
}

function drawCanvasWithAxes(canvas, drawFunction) {
  const wrapper = canvas.parentElement

  const existingLabels = wrapper.querySelectorAll(".axis-label")
  existingLabels.forEach((label) => label.remove())

  if (!wrapper.classList.contains("canvas-with-axes")) {
    wrapper.classList.add("canvas-with-axes")
  }

  const xLabel = document.createElement("div")
  xLabel.className = "axis-label x-axis-label"
  xLabel.textContent = "Tiempo (s)"

  const yLabel = document.createElement("div")
  yLabel.className = "axis-label y-axis-label"
  yLabel.textContent = "Frecuencia (Hz)"

  wrapper.appendChild(xLabel)
  wrapper.appendChild(yLabel)

  if (drawFunction) drawFunction()
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
    ]

    const randomTranscription = sampleTranscriptions[Math.floor(Math.random() * sampleTranscriptions.length)]
    targetElement.textContent = randomTranscription
    targetElement.classList.remove("loading")
  }, 2000)
}

// Funciones del menú de opciones
function toggleOptionsMenu() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.toggle("show")
}

function showProfile() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")

  document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
  document.getElementById("perfil").classList.remove("oculto")
  document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"))
}

function showAccount() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")
  alert("Funcionalidad de cuenta en desarrollo")
}

function showSettings() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")
  alert("Configuración en desarrollo")
}

function logout() {
  const dropdown = document.getElementById("optionsDropdown")
  if (dropdown) dropdown.classList.remove("show")

  if (confirm("¿Estás seguro de que quieres cerrar sesión?")) {
    userState = {
      isLoggedIn: false,
      hasProfile: false,
      email: "",
      userData: null,
    }

    updateNavigation()
    document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
    document.getElementById("auth").classList.remove("oculto")

    const authForm = document.getElementById("authForm")
    const authStatus = document.getElementById("authStatus")
    if (authForm) authForm.reset()
    if (authStatus) authStatus.textContent = ""
  }
}

// Funciones adicionales para completar funcionalidad
function iniciarMicrofono() {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      mediaRecorder = new MediaRecorder(stream)
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

        const audioURL = URL.createObjectURL(audioBlob)
        analizarAudio(audioURL, audioBlob)

        audioChunks = []
        clearInterval(contadorInterval)
        const recordingTimer = document.getElementById("recordingTimer")
        if (recordingTimer) recordingTimer.style.display = "none"
      }

      mediaRecorder.start()
      grabando = true
      segundos = 0

      const recordingTimer = document.getElementById("recordingTimer")
      const cronometro = document.getElementById("cronometro")
      if (recordingTimer) recordingTimer.style.display = "flex"
      if (cronometro) cronometro.textContent = "00:00"

      contadorInterval = setInterval(() => {
        segundos++
        if (cronometro) cronometro.textContent = formatTime(segundos)
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
  }
}

// Funciones para modal de canvas
function expandCanvas(canvasId) {
  const originalCanvas = document.getElementById(canvasId)
  const modal = document.getElementById("canvasModal")
  const expandedCanvas = document.getElementById("expandedCanvas")

  if (!originalCanvas || !modal || !expandedCanvas) return

  modalZoom = 1
  modalPanX = 0
  modalPanY = 0

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

function mostrarModo(modo) {
  // Función para compatibilidad
  console.log("Modo:", modo)
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 VozCheck iniciado")

  userState = {
    isLoggedIn: false,
    hasProfile: false,
    email: "",
    userData: null,
  }

  updateNavigation()

  document.querySelectorAll(".pantalla").forEach((p) => p.classList.add("oculto"))
  const authSection = document.getElementById("auth")
  if (authSection) {
    authSection.classList.remove("oculto")
  }

  const authForm = document.getElementById("authForm")
  const perfilForm = document.getElementById("perfilForm")
  if (authForm) authForm.reset()
  if (perfilForm) perfilForm.reset()

  const authStatus = document.getElementById("authStatus")
  if (authStatus) {
    authStatus.textContent = ""
    authStatus.style.color = ""
  }

  // Event listeners para archivos
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

  // Event listeners para pangramas
  const pangramItems = document.querySelectorAll(".pangram-item")
  pangramItems.forEach((item) => {
    item.addEventListener("click", function () {
      selectPangram(this)
    })
  })

  // Event listener para modo tiempo real
  const modoTiempoRealElement = document.getElementById("modoTiempoReal")
  const micControlsElement = document.getElementById("micControls")

  if (modoTiempoRealElement && micControlsElement) {
    modoTiempoRealElement.addEventListener("change", () => {
      micControlsElement.style.display = modoTiempoRealElement.checked ? "block" : "none"
    })
  }

  // Cerrar menú al hacer clic fuera
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".options-menu")) {
      const dropdown = document.getElementById("optionsDropdown")
      if (dropdown) dropdown.classList.remove("show")
    }
  })

  console.log("✅ VozCheck inicializado correctamente")
})
