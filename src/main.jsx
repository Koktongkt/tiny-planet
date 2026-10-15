import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/fredoka/latin-500.css'
import { bootStage } from './boot.js'
import App from './App.jsx'
bootStage('js', 1) // every startup chunk has been fetched and evaluated
const fontsReady = document.fonts ? document.fonts.load('500 16px Fredoka').catch(() => {}) : Promise.resolve()
fontsReady.then(() => bootStage('fonts', 1))
createRoot(document.getElementById('root')).render(<App />)
