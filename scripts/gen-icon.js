/**
 * Genera public/icon.ico desde public/logo.png
 * Uso: npm run gen-icon
 */
const pngToIco = require('png-to-ico')
const path = require('path')
const fs = require('fs')

const src  = path.join(__dirname, '..', 'public', 'logo.png')
const dest = path.join(__dirname, '..', 'public', 'icon.ico')

if (!fs.existsSync(src)) {
  console.error('❌ No se encontró public/logo.png')
  console.error('   Coloca el logo en esa carpeta y vuelve a correr: npm run gen-icon')
  process.exit(1)
}

pngToIco(src)
  .then(buf => {
    fs.writeFileSync(dest, buf)
    console.log('✅ Ícono generado en public/icon.ico')
  })
  .catch(err => {
    console.error('❌ Error al convertir:', err.message)
  })
