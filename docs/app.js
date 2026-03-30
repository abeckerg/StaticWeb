/* Accessible Task Manager
   - Add, delete, toggle complete
   - Persists in localStorage
*/

const STORAGE_KEY = 'staticweb.tasks'
const doc = (sel, ctx = document) => ctx.querySelector(sel)
const form = doc('#task-form')
const input = doc('#task-input')
const fileInput = doc('#task-file')
const list = doc('#task-list')
const emptyMessage = doc('#list-empty')
const ariaStatus = doc('#aria-status')
const MAX_LEN = 300

let tasks = []

function save(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)) } catch(e) { console.warn('storage:', e) } }
function load(){ try { const raw = localStorage.getItem(STORAGE_KEY); tasks = raw ? JSON.parse(raw) : [] } catch(e){ tasks = [] } }

function announce(msg){ if(ariaStatus) ariaStatus.textContent = msg }

function normalizeTaskTitle(raw){
  const title = String(raw || '').trim()
  if(!title) return ''
  return title.length > MAX_LEN ? title.slice(0, MAX_LEN) : title
}

function createTask(title, completed = false){
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    completed: !!completed
  }
}

function addTaskFromTitle(rawTitle, completed = false){
  const title = normalizeTaskTitle(rawTitle)
  if(!title) return null

  const task = createTask(title, completed)
  tasks.unshift(task)
  return task
}

function parseCompletedValue(value){
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'true' || normalized === 'yes' || normalized === 'y' || normalized === '1' || normalized === 'done' || normalized === 'completed'
}

function isSupportedHeader(value){
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'task' || normalized === 'title' || normalized === 'name' || normalized === 'completed' || normalized === 'done' || normalized === 'status'
}

function getWorkbookArrayBuffer(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read the selected file.'))
    reader.readAsArrayBuffer(file)
  })
}

function getTaskValueFromRow(row){
  if(Array.isArray(row)){
    const firstFilledCell = row.find(cell => String(cell || '').trim())
    return firstFilledCell || ''
  }

  if(!row || typeof row !== 'object') return ''

  const keys = Object.keys(row)
  const preferredKey = keys.find(key => {
    const normalized = key.trim().toLowerCase()
    return normalized === 'task' || normalized === 'title' || normalized === 'name'
  })

  if(preferredKey) return row[preferredKey]

  const firstFilledValue = Object.values(row).find(value => String(value || '').trim())
  return firstFilledValue || ''
}

function getCompletedValueFromRow(row){
  if(!row || Array.isArray(row) || typeof row !== 'object') return false

  const keys = Object.keys(row)
  const completedKey = keys.find(key => {
    const normalized = key.trim().toLowerCase()
    return normalized === 'completed' || normalized === 'done' || normalized === 'status'
  })

  if(!completedKey) return false
  return parseCompletedValue(row[completedKey])
}

async function importTasksFromFile(file){
  if(!file) return

  if(typeof window.XLSX === 'undefined'){
    announce('File import is unavailable because the spreadsheet library did not load.')
    return
  }

  const buffer = await getWorkbookArrayBuffer(file)
  const workbook = window.XLSX.read(buffer, { type: 'array' })
  const worksheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false })

  if(!rawRows.length){
    announce('No valid tasks were found in the selected file.')
    return
  }

  const firstRow = Array.isArray(rawRows[0]) ? rawRows[0] : []
  const hasHeaderRow = firstRow.some(isSupportedHeader)
  const parsedRows = hasHeaderRow
    ? rawRows.slice(1).map(row => Object.fromEntries(firstRow.map((header, index) => [header, row[index] || ''])))
    : rawRows

  let importedCount = 0
  parsedRows.forEach(row => {
    const taskValue = getTaskValueFromRow(row)
    const completed = getCompletedValueFromRow(row)
    const addedTask = addTaskFromTitle(taskValue, completed)
    if(addedTask) importedCount += 1
  })

  if(!importedCount){
    announce('No valid tasks were found in the selected file.')
    return
  }

  save()
  render()
  announce(`Imported ${importedCount} task${importedCount === 1 ? '' : 's'} from ${file.name}`)
}

function createTaskElement(t){
  const li = document.createElement('li')
  li.className = 'task' + (t.completed ? ' completed' : '')

  const label = document.createElement('label')
  label.style.display = 'flex'
  label.style.alignItems = 'center'

  const chk = document.createElement('input')
  chk.type = 'checkbox'
  chk.checked = !!t.completed
  chk.setAttribute('aria-label', `Mark ${t.title} ${t.completed ? 'incomplete' : 'complete'}`)
  chk.addEventListener('change', () => {
    t.completed = chk.checked
    save()
    render()
    announce(t.completed ? `Completed ${t.title}` : `Marked ${t.title} incomplete`)
  })

  const span = document.createElement('span')
  span.className = 'title'
  span.textContent = t.title
  span.style.marginLeft = '10px'

  const controls = document.createElement('div')
  controls.className = 'controls'

  const del = document.createElement('button')
  del.type = 'button'
  del.className = 'btn'
  del.setAttribute('aria-label', `Delete ${t.title}`)
  del.textContent = 'Delete'
  del.addEventListener('click', () => {
    tasks = tasks.filter(x => x.id !== t.id)
    save()
    render()
    announce(`Deleted ${t.title}`)
  })

  label.appendChild(chk)
  label.appendChild(span)
  controls.appendChild(del)
  li.appendChild(label)
  li.appendChild(controls)
  return li
}

function render(){
  list.innerHTML = ''
  // Apply filter
  const visible = tasks.filter(t => {
    if(currentFilter === 'all') return true
    if(currentFilter === 'completed') return !!t.completed
    if(currentFilter === 'pending') return !t.completed
    return true
  })

  if(!visible.length){
    emptyMessage.style.display = 'block'
    list.innerHTML = ''
    return
  }

  emptyMessage.style.display = 'none'
  visible.forEach(t => list.appendChild(createTaskElement(t)))
}

form.addEventListener('submit', e => {
  e.preventDefault()
  const raw = input.value || ''
  const title = normalizeTaskTitle(raw)
  // Validation: prevent empty or whitespace-only tasks
  if(!title){
    input.setAttribute('aria-invalid', 'true')
    input.classList.add('invalid')
    announce('Task cannot be empty')
    input.focus()
    setTimeout(() => { input.removeAttribute('aria-invalid'); input.classList.remove('invalid') }, 1400)
    return
  }

  const task = addTaskFromTitle(title, false)
  input.value = ''
  save()
  render()
  announce(`Added ${task.title}`)
  input.focus()
})

if(fileInput){
  fileInput.addEventListener('change', async e => {
    const [file] = Array.from(e.target.files || [])
    if(!file) return

    try{
      await importTasksFromFile(file)
    }catch(error){
      console.error(error)
      announce('Unable to import tasks from that file.')
    }finally{
      fileInput.value = ''
    }
  })
}
const filterButtons = Array.from(document.querySelectorAll('.filter-btn'))
let currentFilter = 'all'

function setFilter(filter){
  currentFilter = filter
  filterButtons.forEach(btn => {
    const f = btn.getAttribute('data-filter')
    const pressed = f === filter
    btn.setAttribute('aria-pressed', pressed ? 'true' : 'false')
    btn.classList.toggle('active', pressed)
  })
  render()
  announce(`${filter === 'all' ? 'Showing all tasks' : filter === 'completed' ? 'Showing completed tasks' : 'Showing active tasks'}`)
}

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.getAttribute('data-filter')))
})

// Initialize
load()
render()

// --- Dark mode toggle (persists in localStorage) ---
const THEME_KEY = 'staticweb.theme'
const themeToggle = doc('#theme-toggle') || document.getElementById('theme-toggle')

function setTheme(theme){
  const dark = theme === 'dark'
  try{ document.body.classList.toggle('dark', dark) } catch(e){}
  if(themeToggle){
    themeToggle.setAttribute('aria-pressed', dark ? 'true' : 'false')
    themeToggle.textContent = dark ? 'Light' : 'Dark'
    themeToggle.setAttribute('aria-label', dark ? 'Enable light mode' : 'Enable dark mode')
  }
  try{ localStorage.setItem(THEME_KEY, theme) } catch(e){}
  // announce change for screen reader users
  announce(dark ? 'Dark mode enabled' : 'Light mode enabled')
}

if(themeToggle){
  themeToggle.addEventListener('click', () => {
    const current = document.body.classList.contains('dark') ? 'dark' : 'light'
    setTheme(current === 'dark' ? 'light' : 'dark')
  })
}

// Initialize from saved preference or system preference
try{
  const saved = localStorage.getItem(THEME_KEY)
  if(saved) setTheme(saved)
  else if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark')
  else setTheme('light')
}catch(e){ setTheme('light') }

