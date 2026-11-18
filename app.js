const LEGACY_STORAGE_KEY = "financas_pwa_v2";
const CACHE_PREFIX = "financas_pwa_v3";
const LAST_USER_KEY = "financas_pwa_last_user";
const MIGRATION_PREFIX = "financas_pwa_migrated";
const SUPABASE_URL = "https://extaofvfrnrgmxvgnlto.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8u8nNb3J9mz49Ds2wvVA_A_5s2MeR34";
const CATEGORIES = ["Alimentação","Transporte","Moradia","Contas","Lazer","Saúde","Educação","Compras","Assinaturas","Investimentos","Salário","Outros"];
const CATEGORY_COLORS = ["#38bdf8","#34d399","#fb7185","#fbbf24","#a78bfa","#2dd4bf","#f97316","#60a5fa","#f472b6","#84cc16","#c084fc","#94a3b8"];
const KEYWORDS = {
  "Alimentação": ["ifood","rappi","restaurante","mercado","supermercado","padaria","açougue","lanchonete","food","bebidas"],
  "Transporte": ["uber","99 ","99app","posto","combust","gasolina","etanol","estacionamento","pedágio","onibus","ônibus","metro"],
  "Moradia": ["aluguel","condominio","condomínio","imobiliaria","imobiliária"],
  "Contas": ["energia","eletric","água","agua","internet","telefone","celular","boleto","saneamento"],
  "Lazer": ["cinema","bar ","show","viagem","hotel","jogo"],
  "Saúde": ["farmacia","farmácia","hospital","medico","médico","plano de saude","plano de saúde","odonto","exame"],
  "Educação": ["curso","faculdade","escola","livro","udemy","alura"],
  "Compras": ["shopee","mercado livre","magazine","loja","amazon","americanas"],
  "Assinaturas": ["netflix","spotify","prime","disney","hbo","icloud","google one","youtube premium"],
  "Investimentos": ["investimento","aplicação","aplicacao","tesouro","cdb"],
  "Salário": ["salario","salário","pagamento salario","pagamento salário"]
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const uid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c => (Number(c) ^ (Math.random() * 16 >> Number(c) / 4)).toString(16));
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const currentMonth = () => today().slice(0,7);
const monthOf = date => String(date || "").slice(0,7);
const normalizeText = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g," ").trim();
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[c]);
const formatMoney = value => new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL"}).format(Number(value) || 0);
const formatCompactMoney = value => new Intl.NumberFormat("pt-BR", {style:"currency",currency:"BRL",notation:"compact",maximumFractionDigits:1}).format(Number(value) || 0);
const formatDate = value => value ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`)) : "—";
const formatMonth = value => {
  if (!/^\d{4}-\d{2}$/.test(value || "")) return "";
  return new Intl.DateTimeFormat("pt-BR", {month:"short",year:"2-digit"}).format(new Date(`${value}-15T12:00:00`)).replace(" de ","/");
};

function parseMoney(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  let s = String(value || "").trim().replace(/[^\d,.-]/g, "");
  if (!s) return 0;
  const negative = s.includes("-") || /^\(.*\)$/.test(String(value));
  s = s.replace(/-/g, "");
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? /\./g : /,/g;
    s = s.replace(thousands, "").replace(decimal, ".");
  } else if (lastComma >= 0) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if ((s.match(/\./g) || []).length > 1) {
    const parts = s.split(".");
    const decimal = parts.pop();
    s = `${parts.join("")}.${decimal}`;
  }
  const number = Number.parseFloat(s);
  return Number.isFinite(number) ? (negative ? -Math.abs(number) : number) : 0;
}

function normalizeDate(value, fallbackYear = new Date().getFullYear()) {
  const raw = String(value || "").trim().replace(/[.]/g,"/");
  let match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (match) return validDate(match[1], match[2], match[3]);
  match = raw.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?/);
  if (!match) return "";
  let year = Number(match[3] || fallbackYear);
  if (year < 100) year += year < 70 ? 2000 : 1900;
  return validDate(year, match[2], match[1]);
}

function validDate(year, month, day) {
  const y = Number(year), m = Number(month), d = Number(day);
  const date = new Date(y, m-1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m-1 || date.getDate() !== d) return "";
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}

function guessCategory(description, type = "expense") {
  if (type === "income" && /sal[aá]rio|pagamento|provento/i.test(description || "")) return "Salário";
  const text = normalizeText(description);
  for (const [category, terms] of Object.entries(KEYWORDS)) {
    if (terms.some(term => text.includes(normalizeText(term)))) return category;
  }
  return "Outros";
}

function defaultState() {
  return {version:3, transactions:[], bills:[], ideas:[], budgets:{}, sync:{pending:[],lastSync:null}};
}

function sanitizeTransaction(transaction) {
  const type = transaction.type === "income" ? "income" : "expense";
  return {
    id: String(transaction.id || uid()),
    type,
    description: String(transaction.description || transaction.desc || "Sem descrição").slice(0,90),
    amount: Math.abs(Number(transaction.amount) || 0),
    category: CATEGORIES.includes(transaction.category) ? transaction.category : guessCategory(transaction.description || transaction.desc, type),
    paymentMethod: String(transaction.paymentMethod || transaction.payment_method || (transaction.isCard ? "Crédito" : "Outro")),
    date: normalizeDate(transaction.date || transaction.transaction_date) || today(),
    notes: String(transaction.notes || "").slice(0,240),
    source: String(transaction.source || "manual"),
    createdAt: transaction.createdAt || transaction.created_at || new Date().toISOString(),
    updatedAt: transaction.updatedAt || transaction.updated_at || transaction.createdAt || transaction.created_at || new Date().toISOString()
  };
}

function sanitizeBill(bill) {
  return {
    id:String(bill.id || uid()), description:String(bill.description || bill.desc || "Conta").slice(0,90),
    amount:Math.abs(Number(bill.amount)||0), due:normalizeDate(bill.due || bill.due_date)||today(),
    paid:bill.paid === true || bill.status === "paid", createdAt:bill.createdAt || bill.created_at || new Date().toISOString(),
    updatedAt:bill.updatedAt || bill.updated_at || bill.createdAt || bill.created_at || new Date().toISOString()
  };
}

function sanitizeIdea(idea) {
  return {id:String(idea.id || uid()),text:String(idea.text || "").slice(0,400),createdAt:idea.createdAt || idea.created_at || new Date().toISOString(),updatedAt:idea.updatedAt || idea.updated_at || idea.createdAt || idea.created_at || new Date().toISOString()};
}

function normalizeState(raw) {
  const base = defaultState();
  if (!raw || typeof raw !== "object") return base;
  const budgets = raw.budgets && typeof raw.budgets === "object" ? raw.budgets : {};
  if (!Object.keys(budgets).length && Number(raw.settings?.monthlyBudget) > 0) budgets[currentMonth()] = Number(raw.settings.monthlyBudget);
  return {
    version:3,
    transactions:Array.isArray(raw.transactions) ? raw.transactions.map(sanitizeTransaction).filter(item => item.amount > 0) : [],
    bills:Array.isArray(raw.bills) ? raw.bills.map(sanitizeBill).filter(item => item.amount > 0) : [],
    ideas:Array.isArray(raw.ideas) ? raw.ideas.map(sanitizeIdea).filter(item => item.text) : [],
    budgets:Object.fromEntries(Object.entries(budgets).map(([month,amount]) => [String(month).slice(0,7),Math.abs(Number(amount)||0)])),
    sync:{pending:Array.isArray(raw.sync?.pending) ? raw.sync.pending : [],lastSync:raw.sync?.lastSync || null}
  };
}

function loadLegacyState() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.transactions)) return normalizeState(saved);
    const transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
    const bills = JSON.parse(localStorage.getItem("boletos") || "[]");
    const ideas = JSON.parse(localStorage.getItem("ideas") || "[]");
    if (transactions.length || bills.length || ideas.length || Number(localStorage.getItem("monthlyBudget"))) {
      return normalizeState({transactions,bills,ideas,settings:{monthlyBudget:Number(localStorage.getItem("monthlyBudget"))||0}});
    }
  } catch (error) { console.warn("Falha ao ler a base local anterior", error); }
  return defaultState();
}

function cacheKey(userId) { return `${CACHE_PREFIX}:${userId}`; }
function loadUserState(userId) {
  try { return normalizeState(JSON.parse(localStorage.getItem(cacheKey(userId)) || "null")); }
  catch (error) { console.warn("Falha ao abrir cache sincronizado", error); return defaultState(); }
}

const legacyState = loadLegacyState();
let state = defaultState();
let pendingImport = [];
let toastTimer;
let deferredInstallPrompt = null;
let pdfModule = null;
let cloud = null;
let session = null;
let realtimeChannel = null;
let syncInProgress = false;
let refreshTimer = null;

function currentUserId() { return session?.user?.id || ""; }
function saveState() {
  if (!currentUserId()) return false;
  try {
    localStorage.setItem(cacheKey(currentUserId()), JSON.stringify(state));
    localStorage.setItem(LAST_USER_KEY, currentUserId());
    return true;
  } catch (error) {
    showToast("Não foi possível atualizar o cache local. O armazenamento pode estar cheio.", "error");
    return false;
  }
}

function showToast(message, type = "success") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3600);
}

function setLoading(show, text = "Processando...") {
  $("#loadingText").textContent = text;
  $("#loadingOverlay").classList.toggle("hidden", !show);
}

function askConfirmation(title, message, confirmLabel = "Confirmar") {
  const dialog = $("#confirmDialog");
  if (!dialog?.showModal) return Promise.resolve(window.confirm(message));
  $("#dialogTitle").textContent = title;
  $("#dialogMessage").textContent = message;
  $("#dialogConfirm").textContent = confirmLabel;
  dialog.showModal();
  return new Promise(resolve => dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), {once:true}));
}

function navigate(view) {
  const target = $(`#view-${view}`);
  if (!target) return;
  $$(".view").forEach(section => section.classList.toggle("active", section === target));
  $$(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.nav === view));
  if (view === "dashboard") renderDashboard();
  if (view === "transactions") renderTransactions();
  if (view === "more") renderMore();
  window.scrollTo({top:0,behavior:"smooth"});
  history.replaceState(null,"",`#${view}`);
}

function populateCategories() {
  const options = CATEGORIES.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("");
  $("#category").innerHTML = options;
  $("#filterCategory").insertAdjacentHTML("beforeend", options);
}

function setTransactionType(type) {
  $("#transactionType").value = type;
  $$(".segment").forEach(button => button.classList.toggle("active", button.dataset.type === type));
  if (!$("#transactionId").value) $("#category").value = type === "income" ? "Salário" : "Outros";
}

function resetTransactionForm() {
  $("#transactionForm").reset();
  $("#transactionId").value = "";
  $("#date").value = today();
  $("#paymentMethod").value = "Pix";
  $("#saveTransactionText").textContent = "Salvar movimentação";
  $("#cancelEditBtn").classList.add("hidden");
  setTransactionType("expense");
}

async function onTransactionSubmit(event) {
  event.preventDefault();
  const description = $("#description").value.trim();
  const amount = Math.abs(parseMoney($("#amount").value));
  const date = normalizeDate($("#date").value);
  if (!description || !amount || !date) return showToast("Preencha descrição, valor e data válidos.", "error");
  const id = $("#transactionId").value;
  const previous = state.transactions.find(item => item.id === id);
  const transaction = sanitizeTransaction({
    id:id || uid(), type:$("#transactionType").value, description, amount,
    category:$("#category").value, paymentMethod:$("#paymentMethod").value,
    date, notes:$("#notes").value.trim(), source:id ? (previous?.source || "manual") : "manual",
    createdAt:previous?.createdAt || new Date().toISOString(), updatedAt:new Date().toISOString()
  });
  state.transactions = id ? state.transactions.map(item => item.id === id ? transaction : item) : [...state.transactions,transaction];
  queueMutation("transactions","upsert",transaction,transaction.id);
  saveState();
  $("#dashboardMonth").value = monthOf(date); $("#listMonth").value = monthOf(date);
  resetTransactionForm(); renderAll(); navigate("transactions");
  showToast(id ? "Movimentação atualizada." : "Movimentação salva.");
  await syncPending();
}

function editTransaction(id) {
  const transaction = state.transactions.find(item => item.id === id);
  if (!transaction) return;
  $("#transactionId").value = transaction.id;
  $("#description").value = transaction.description;
  $("#amount").value = transaction.amount.toFixed(2).replace(".",",");
  $("#category").value = transaction.category;
  $("#paymentMethod").value = transaction.paymentMethod;
  $("#date").value = transaction.date;
  $("#notes").value = transaction.notes;
  $("#saveTransactionText").textContent = "Atualizar movimentação";
  $("#cancelEditBtn").classList.remove("hidden");
  setTransactionType(transaction.type);
  navigate("add");
  $("#description").focus();
}

async function deleteTransaction(id) {
  const transaction = state.transactions.find(item => item.id === id);
  if (!transaction) return;
  if (!(await askConfirmation("Excluir movimentação", `Deseja excluir “${transaction.description}”?`, "Excluir"))) return;
  state.transactions = state.transactions.filter(item => item.id !== id);
  queueMutation("transactions","delete",null,id); saveState(); renderAll();
  showToast("Movimentação excluída."); await syncPending();
}

function transactionsForMonth(month) { return state.transactions.filter(t => monthOf(t.date) === month); }
function totalsFor(items) {
  const income = items.filter(t => t.type === "income").reduce((sum,t) => sum + t.amount, 0);
  const expense = items.filter(t => t.type === "expense").reduce((sum,t) => sum + t.amount, 0);
  return {income, expense, balance:income-expense};
}
function shiftMonth(month, offset) {
  const [year,m] = month.split("-").map(Number);
  const date = new Date(year,m-1+offset,1);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;
}

function renderDashboard() {
  const month = $("#dashboardMonth").value || currentMonth();
  const items = transactionsForMonth(month);
  const totals = totalsFor(items);
  const budget = Number(state.budgets?.[month]) || 0;
  const margin = budget - totals.expense;
  const savingRate = totals.income > 0 ? (totals.balance / totals.income) * 100 : 0;
  $("#balanceValue").textContent = formatMoney(totals.balance);
  $("#incomeValue").textContent = formatMoney(totals.income);
  $("#expenseValue").textContent = formatMoney(totals.expense);
  $("#savingRateValue").textContent = `${savingRate.toFixed(1).replace(".",",")}%`;
  $("#budgetMarginValue").textContent = budget ? formatMoney(margin) : "Não definido";

  const previous = totalsFor(transactionsForMonth(shiftMonth(month,-1))).expense;
  const badge = $("#balanceBadge");
  if (!items.length) { badge.textContent = "Sem dados"; badge.className = "status-pill neutral"; }
  else if (previous > 0) {
    const change = ((totals.expense - previous) / previous) * 100;
    badge.textContent = `${change > 0 ? "↑" : "↓"} ${Math.abs(change).toFixed(1).replace(".",",")}% vs. mês anterior`;
    badge.className = `status-pill ${change <= 0 ? "good" : "bad"}`;
  } else { badge.textContent = totals.balance >= 0 ? "Saldo positivo" : "Saldo negativo"; badge.className = `status-pill ${totals.balance >= 0 ? "good" : "bad"}`; }

  const percent = budget > 0 ? (totals.expense / budget) * 100 : 0;
  $("#budgetPercent").textContent = budget ? `${Math.round(percent)}%` : "Defina nos ajustes";
  $("#budgetSpent").textContent = `${formatMoney(totals.expense)} usados`;
  $("#budgetTotal").textContent = `de ${formatMoney(budget)}`;
  const progress = $("#budgetProgress");
  progress.style.width = `${Math.min(percent,100)}%`;
  progress.className = `progress-fill ${percent > 100 ? "over" : percent >= 80 ? "warning" : ""}`;
  renderTrendChart(month);
  renderCategoryChart(items);
  renderTopExpenses(items);
}

function renderTrendChart(endMonth) {
  const months = Array.from({length:6},(_,index) => shiftMonth(endMonth,index-5));
  const data = months.map(month => totalsFor(transactionsForMonth(month)));
  const max = Math.max(1,...data.flatMap(item => [item.income,item.expense]));
  const width = 600, height = 190, left = 16, right = 12, top = 12, bottom = 30;
  const x = index => left + index * ((width-left-right)/(months.length-1));
  const y = value => top + (height-top-bottom) * (1 - value/max);
  const points = key => data.map((item,index) => `${x(index)},${y(item[key])}`).join(" ");
  const areaPoints = key => `${left},${height-bottom} ${points(key)} ${width-right},${height-bottom}`;
  const labels = months.map((month,index) => `<text x="${x(index)}" y="${height-8}" text-anchor="middle">${escapeHtml(formatMonth(month).replace(".",""))}</text>`).join("");
  const grid = [0,.5,1].map(ratio => `<line class="grid" x1="${left}" x2="${width-right}" y1="${top+(height-top-bottom)*ratio}" y2="${top+(height-top-bottom)*ratio}"/>`).join("");
  $("#trendChart").innerHTML = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="incomeArea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#34d399"/><stop offset="1" stop-color="#34d399" stop-opacity="0"/></linearGradient><linearGradient id="expenseArea" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fb7185"/><stop offset="1" stop-color="#fb7185" stop-opacity="0"/></linearGradient></defs>${grid}<polygon class="area" fill="url(#incomeArea)" points="${areaPoints("income")}"/><polygon class="area" fill="url(#expenseArea)" points="${areaPoints("expense")}"/><polyline class="line income-line" points="${points("income")}"/><polyline class="line expense-line" points="${points("expense")}"/>${labels}</svg>`;
}

function renderCategoryChart(items) {
  const expenses = items.filter(t => t.type === "expense");
  const total = expenses.reduce((sum,t) => sum+t.amount,0);
  const grouped = Object.entries(expenses.reduce((map,t) => ({...map,[t.category]:(map[t.category]||0)+t.amount}),{})).sort((a,b) => b[1]-a[1]);
  let cursor = 0;
  const stops = grouped.slice(0,7).map(([category,value],index) => {
    const start = cursor; cursor += total ? value/total*100 : 0;
    return `${CATEGORY_COLORS[CATEGORIES.indexOf(category)%CATEGORY_COLORS.length]} ${start}% ${cursor}%`;
  });
  $("#categoryDonut").style.background = stops.length ? `conic-gradient(${stops.join(",")})` : "var(--line)";
  $("#donutTotal").textContent = formatCompactMoney(total);
  $("#categoryLegend").innerHTML = grouped.length ? grouped.slice(0,5).map(([category,value],index) => `<div class="category-legend-item"><i style="background:${CATEGORY_COLORS[CATEGORIES.indexOf(category)%CATEGORY_COLORS.length]}"></i><span>${escapeHtml(category)}</span><strong>${total ? Math.round(value/total*100) : 0}%</strong></div>`).join("") : `<span class="muted">Sem despesas</span>`;
}

function renderTopExpenses(items) {
  const top = items.filter(t => t.type === "expense").sort((a,b) => b.amount-a.amount).slice(0,5);
  const container = $("#topExpenses");
  container.classList.toggle("empty-state", !top.length);
  container.innerHTML = top.length ? top.map(item => `<div class="simple-row"><div class="row-main"><strong>${escapeHtml(item.description)}</strong><small>${escapeHtml(item.category)} • ${formatDate(item.date)}</small></div><strong>− ${formatMoney(item.amount)}</strong></div>`).join("") : "Nenhuma despesa neste mês.";
}

function renderTransactions() {
  const month = $("#listMonth").value;
  const type = $("#filterType").value;
  const category = $("#filterCategory").value;
  const search = normalizeText($("#searchTransactions").value);
  const filtered = state.transactions.filter(item => (!month || monthOf(item.date) === month) && (type === "all" || item.type === type) && (category === "all" || item.category === category) && (!search || normalizeText(`${item.description} ${item.notes}`).includes(search))).sort((a,b) => b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt)));
  const totals = totalsFor(filtered);
  $("#listSummary").innerHTML = `<span>${filtered.length} lançamento${filtered.length === 1 ? "" : "s"}</span><strong>Saldo: ${formatMoney(totals.balance)}</strong>`;
  const list = $("#transactionList");
  list.innerHTML = filtered.length ? filtered.map(item => `<article class="transaction-item ${item.type}"><span class="transaction-symbol">${item.type === "income" ? "↗" : "↘"}</span><div class="transaction-content"><strong>${escapeHtml(item.description)}</strong><small>${formatDate(item.date)} • ${escapeHtml(item.category)} • ${escapeHtml(item.paymentMethod)}</small></div><div class="transaction-side"><strong>${item.type === "income" ? "+" : "−"} ${formatMoney(item.amount)}</strong><div class="item-actions"><button class="mini-action" type="button" data-edit="${item.id}">Editar</button><button class="mini-action" type="button" data-delete="${item.id}">Excluir</button></div></div></article>`).join("") : `<div class="card empty-state">Nenhuma movimentação encontrada.</div>`;
}

function isDuplicate(candidate, extra = []) {
  const all = [...state.transactions,...extra];
  const description = normalizeText(candidate.description).slice(0,50);
  return all.some(item => item.date === candidate.date && item.type === candidate.type && Math.abs(item.amount-candidate.amount) < .01 && normalizeText(item.description).slice(0,50) === description);
}

function detectDelimiter(line) {
  const choices = [";",",","\t"];
  return choices.sort((a,b) => (line.split(b).length-1)-(line.split(a).length-1))[0];
}

function parseCSVRows(text, delimiter) {
  const rows = []; let row = [], cell = "", quoted = false;
  for (let i=0;i<text.length;i++) {
    const char = text[i], next = text[i+1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell.trim()); cell = "";
      if (row.some(Boolean)) rows.push(row); row = [];
    } else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function findHeader(headers, aliases) {
  const normalized = headers.map(normalizeText);
  return normalized.findIndex(header => aliases.some(alias => header === alias || header.includes(alias)));
}

function parseDelimited(text, sourceName = "arquivo") {
  const firstLine = text.split(/\r?\n/).find(line => line.trim()) || "";
  const delimiter = detectDelimiter(firstLine);
  const rows = parseCSVRows(text, delimiter);
  if (rows.length < 2) return [];
  const headers = rows[0];
  const dateIndex = findHeader(headers,["date","data"]);
  const descriptionIndex = findHeader(headers,["title","descricao","description","historico","estabelecimento","lançamento","lancamento"]);
  const amountIndex = findHeader(headers,["amount","valor","value"]);
  const typeIndex = findHeader(headers,["tipo","type","natureza"]);
  if (descriptionIndex < 0 || amountIndex < 0) return [];
  const headerText = normalizeText(headers.join(" "));
  const isCard = /title.*amount|fatura|cartao|cartão/.test(headerText) || /nubank/i.test(sourceName);
  return rows.slice(1).map(row => {
    const signed = parseMoney(row[amountIndex]);
    if (!signed) return null;
    const typeText = normalizeText(typeIndex >= 0 ? row[typeIndex] : "");
    let type = /receita|credito|crédito|entrada|income/.test(typeText) ? "income" : /despesa|debito|débito|saida|saída|expense/.test(typeText) ? "expense" : isCard ? "expense" : signed < 0 ? "expense" : "income";
    const description = String(row[descriptionIndex] || "Importado").trim().slice(0,90);
    const date = normalizeDate(dateIndex >= 0 ? row[dateIndex] : "") || today();
    return sanitizeTransaction({id:uid(),type,description,amount:Math.abs(signed),category:guessCategory(description,type),paymentMethod:isCard ? "Crédito" : "Outro",date,source:`import:${sourceName}`});
  }).filter(Boolean);
}

function parseTextLines(text, sourceName = "texto") {
  const lines = text.split(/\r?\n/).map(line => line.replace(/\s+/g," ").trim()).filter(Boolean);
  const skip = /saldo anterior|total da fatura|total para|limite dispon|vencimento|melhor dia|resumo da fatura|pagamento recebido|subtotal|encargos|marco a c urbano|xxxx/i;
  const results = [];
  for (const line of lines) {
    if (skip.test(line)) continue;
    const dateMatch = line.match(/(?:^|\s)(\d{1,2}[\/.\-]\d{1,2}(?:[\/.\-]\d{2,4})?|\d{4}-\d{2}-\d{2})(?:\s|$)/);
    const amounts = [...line.matchAll(/(?:R\$\s*)?(-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+[,.]\d{2})(?!\d)/g)];
    if (!amounts.length) continue;
    const amountMatch = amounts.at(-1);
    const signed = parseMoney(amountMatch[1]);
    if (!signed) continue;
    const isLikelyCard = /fatura|cart[aã]o|nubank/i.test(text) || /\.pdf$/i.test(sourceName);
    const type = isLikelyCard ? "expense" : signed < 0 ? "expense" : "expense";
    let description = line;
    if (dateMatch) description = description.replace(dateMatch[1], " ");
    description = description.replace(amountMatch[0], " ").replace(/\b(?:R\$|BRL|USD|US\$)\b/gi," ").replace(/[;|\t]+/g," ").replace(/\s+/g," ").trim().replace(/^[-–—,]+|[-–—,]+$/g,"").slice(0,90);
    if (description.length < 2) description = "Lançamento importado";
    const date = normalizeDate(dateMatch?.[1]) || today();
    results.push(sanitizeTransaction({id:uid(),type,description,amount:Math.abs(signed),category:guessCategory(description,type),paymentMethod:isLikelyCard ? "Crédito" : "Outro",date,source:`import:${sourceName}`}));
  }
  return results;
}

function parseImportText(text, sourceName = "texto") {
  const first = text.split(/\r?\n/).find(Boolean) || "";
  const header = normalizeText(first);
  const looksDelimited = /(^|[;,\t])(date|data|title|descricao|description|historico|amount|valor)([;,\t]|$)/.test(header) || ((first.match(/[;,\t]/g)||[]).length >= 2 && /data|date|valor|amount/i.test(first));
  const parsed = looksDelimited ? parseDelimited(text,sourceName) : parseTextLines(text,sourceName);
  return parsed.filter(item => item.amount > 0 && item.date);
}

async function getPdfModule() {
  if (!pdfModule) {
    pdfModule = await import("./vendor/pdf.mjs");
    pdfModule.GlobalWorkerOptions.workerSrc = new URL("./vendor/pdf.worker.mjs", import.meta.url).href;
  }
  return pdfModule;
}

async function extractPdfText(file) {
  const pdfjs = await getPdfModule();
  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({data}).promise;
  const pageTexts = [];
  for (let pageNumber=1; pageNumber<=document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const rows = new Map();
    content.items.forEach(item => {
      const y = Math.round(item.transform?.[5] || 0);
      const key = [...rows.keys()].find(existing => Math.abs(existing-y) <= 2) ?? y;
      if (!rows.has(key)) rows.set(key,[]);
      rows.get(key).push({x:item.transform?.[4] || 0,text:item.str});
    });
    const text = [...rows.entries()].sort((a,b) => b[0]-a[0]).map(([,items]) => items.sort((a,b) => a.x-b.x).map(item => item.text).join(" ").replace(/\s+/g," ").trim()).filter(Boolean).join("\n");
    pageTexts.push(text);
  }
  return pageTexts.join("\n");
}

async function analyzeFiles(files) {
  if (!files.length) return;
  setLoading(true, `Analisando ${files.length} arquivo${files.length === 1 ? "" : "s"}...`);
  const candidates = [];
  const errors = [];
  try {
    for (const file of files) {
      try {
        let text;
        if (/\.pdf$/i.test(file.name) || file.type === "application/pdf") text = await extractPdfText(file);
        else text = await file.text();
        const parsed = parseImportText(text,file.name);
        if (!parsed.length) errors.push(`${file.name}: nenhum lançamento reconhecido`);
        candidates.push(...parsed);
      } catch (error) {
        console.error(error);
        errors.push(`${file.name}: não foi possível ler o arquivo`);
      }
    }
    prepareImport(candidates);
    if (errors.length) showToast(errors.join(" • "), "error");
    else showToast(`${candidates.length} lançamento(s) encontrado(s). Confira antes de importar.`);
  } finally { setLoading(false); $("#importFile").value = ""; }
}

function prepareImport(candidates) {
  const accepted = [];
  pendingImport = candidates.map(candidate => {
    const duplicate = isDuplicate(candidate,accepted);
    if (!duplicate) accepted.push(candidate);
    return {...candidate,duplicate,selected:!duplicate};
  });
  renderImportPreview();
  $("#importResult").classList.toggle("hidden", !pendingImport.length);
  if (pendingImport.length) $("#importResult").scrollIntoView({behavior:"smooth",block:"start"});
}

function renderImportPreview() {
  const total = pendingImport.length;
  const duplicates = pendingImport.filter(item => item.duplicate).length;
  const selected = pendingImport.filter(item => item.selected && !item.duplicate).length;
  $("#importCount").textContent = `${total} ${total === 1 ? "item" : "itens"}`;
  $("#importStats").innerHTML = `<div class="import-stat"><strong>${total}</strong><span>identificados</span></div><div class="import-stat"><strong>${duplicates}</strong><span>duplicados</span></div><div class="import-stat"><strong>${selected}</strong><span>selecionados</span></div>`;
  $("#confirmImportBtn").textContent = `Importar ${selected} selecionado${selected === 1 ? "" : "s"}`;
  $("#confirmImportBtn").disabled = selected === 0;
  $("#importPreview").innerHTML = pendingImport.map((item,index) => `<article class="preview-item ${item.duplicate ? "duplicate" : ""}" data-preview-index="${index}"><input class="preview-check" type="checkbox" ${item.selected ? "checked" : ""} ${item.duplicate ? "disabled" : ""} aria-label="Selecionar ${escapeHtml(item.description)}"><div><div class="preview-top"><input class="preview-description" value="${escapeHtml(item.description)}" maxlength="90" aria-label="Descrição"><strong>${item.type === "income" ? "+" : "−"} ${formatMoney(item.amount)}</strong></div><div class="preview-meta"><input class="preview-date" type="date" value="${item.date}" aria-label="Data"><select class="preview-category" aria-label="Categoria">${CATEGORIES.map(category => `<option ${category === item.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select><select class="preview-type" aria-label="Tipo"><option value="expense" ${item.type === "expense" ? "selected" : ""}>Despesa</option><option value="income" ${item.type === "income" ? "selected" : ""}>Receita</option></select><select class="preview-payment" aria-label="Forma de pagamento"><option ${item.paymentMethod === "Crédito" ? "selected" : ""}>Crédito</option><option ${item.paymentMethod === "Débito" ? "selected" : ""}>Débito</option><option ${item.paymentMethod === "Pix" ? "selected" : ""}>Pix</option><option ${item.paymentMethod === "Outro" ? "selected" : ""}>Outro</option></select></div>${item.duplicate ? `<div class="duplicate-note">Possível duplicidade — não será importado</div>` : ""}</div></article>`).join("");
}

function updatePreviewItem(event) {
  const article = event.target.closest("[data-preview-index]");
  if (!article) return;
  const item = pendingImport[Number(article.dataset.previewIndex)];
  if (!item) return;
  if (event.target.matches(".preview-check")) item.selected = event.target.checked;
  if (event.target.matches(".preview-description")) item.description = event.target.value.trim() || "Importado";
  if (event.target.matches(".preview-date")) item.date = normalizeDate(event.target.value) || item.date;
  if (event.target.matches(".preview-category")) item.category = event.target.value;
  if (event.target.matches(".preview-type")) item.type = event.target.value;
  if (event.target.matches(".preview-payment")) item.paymentMethod = event.target.value;
  const selected = pendingImport.filter(entry => entry.selected && !entry.duplicate).length;
  $("#importStats").children[2].querySelector("strong").textContent = selected;
  $("#confirmImportBtn").textContent = `Importar ${selected} selecionado${selected === 1 ? "" : "s"}`;
  $("#confirmImportBtn").disabled = selected === 0;
}

function cancelImport() {
  pendingImport = [];
  $("#importResult").classList.add("hidden");
  $("#importPreview").innerHTML = "";
}

async function confirmImport() {
  const candidates = pendingImport.filter(item => item.selected && !item.duplicate);
  if (!candidates.length) return showToast("Selecione ao menos um lançamento.", "error");
  const selected = [];
  for (const item of candidates) {
    const fingerprint = `${item.date}|${item.type}|${Number(item.amount).toFixed(2)}|${normalizeText(item.description).slice(0,60)}`;
    selected.push(sanitizeTransaction({...item,id:await deterministicUuid(fingerprint),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}));
  }
  const added = selected.filter(item => !state.transactions.some(existing => existing.id === item.id) && !isDuplicate(item,selected.filter(x => x.id !== item.id)));
  if (!added.length) return showToast("Todos os lançamentos selecionados já existem.", "error");
  state.transactions.push(...added);
  added.forEach(item => queueMutation("transactions","upsert",item,item.id));
  if (!saveState()) return;
  const latestMonth = added.map(item => monthOf(item.date)).sort().at(-1) || currentMonth();
  $("#dashboardMonth").value = latestMonth; $("#listMonth").value = latestMonth; $("#pasteText").value = "";
  cancelImport(); renderAll(); navigate("transactions");
  showToast(`${added.length} lançamento(s) importado(s). Lista e Dashboard atualizados.`);
  await syncPending();
}

async function onBillSubmit(event) {
  event.preventDefault();
  const description = $("#billDescription").value.trim();
  const amount = Math.abs(parseMoney($("#billAmount").value));
  const due = normalizeDate($("#billDue").value);
  if (!description || !amount || !due) return showToast("Preencha a conta corretamente.", "error");
  const bill = sanitizeBill({id:uid(),description,amount,due,paid:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  state.bills.push(bill); queueMutation("bills","upsert",bill,bill.id); saveState();
  event.target.reset(); $("#billDue").value = today(); renderBills(); showToast("Conta adicionada."); await syncPending();
}

async function handleBillAction(button) {
  const id = button.dataset.billPay || button.dataset.billDelete;
  const bill = state.bills.find(item => item.id === id);
  if (!bill) return;
  if (button.dataset.billDelete) {
    if (!(await askConfirmation("Excluir conta", `Deseja excluir “${bill.description}”?`, "Excluir"))) return;
    state.bills = state.bills.filter(item => item.id !== id); queueMutation("bills","delete",null,id);
  } else {
    bill.paid = !bill.paid; bill.updatedAt = new Date().toISOString(); queueMutation("bills","upsert",bill,bill.id);
  }
  saveState(); renderBills(); showToast(button.dataset.billDelete ? "Conta excluída." : bill.paid ? "Conta marcada como paga." : "Conta reaberta."); await syncPending();
}

function renderBills() {
  const bills = [...state.bills].sort((a,b) => a.paid-b.paid || a.due.localeCompare(b.due));
  const pending = bills.filter(b => !b.paid);
  $("#billSummary").innerHTML = `<span>${pending.length} pendente${pending.length === 1 ? "" : "s"}</span><strong>${formatMoney(pending.reduce((sum,b) => sum+b.amount,0))}</strong>`;
  $("#billList").innerHTML = bills.length ? bills.map(bill => `<article class="transaction-item ${bill.paid ? "income" : "expense"}"><span class="transaction-symbol">${bill.paid ? "✓" : "!"}</span><div class="transaction-content"><strong>${escapeHtml(bill.description)}</strong><small>Vence ${formatDate(bill.due)} • ${bill.paid ? "Paga" : "Pendente"}</small></div><div class="transaction-side"><strong>${formatMoney(bill.amount)}</strong><div class="item-actions"><button class="mini-action" data-bill-pay="${bill.id}">${bill.paid ? "Reabrir" : "Marcar paga"}</button><button class="mini-action" data-bill-delete="${bill.id}">Excluir</button></div></div></article>`).join("") : `<div class="card empty-state">Nenhuma conta cadastrada.</div>`;
}

async function onIdeaSubmit(event) {
  event.preventDefault(); const text = $("#ideaText").value.trim(); if (!text) return;
  const idea = sanitizeIdea({id:uid(),text,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
  state.ideas.push(idea); queueMutation("ideas","upsert",idea,idea.id); saveState(); event.target.reset(); renderIdeas(); showToast("Ideia salva."); await syncPending();
}
function renderIdeas() {
  const ideas = [...state.ideas].sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  $("#ideaList").innerHTML = ideas.length ? ideas.map(idea => `<article class="note-card"><button type="button" data-idea-delete="${idea.id}" aria-label="Excluir ideia">×</button><p>${escapeHtml(idea.text)}</p><small>${new Intl.DateTimeFormat("pt-BR",{dateStyle:"medium"}).format(new Date(idea.createdAt))}</small></article>`).join("") : `<div class="card empty-state">Nenhuma ideia ou meta cadastrada.</div>`;
}
async function deleteIdea(id) {
  if (!(await askConfirmation("Excluir anotação", "Deseja excluir esta ideia ou meta?", "Excluir"))) return;
  state.ideas = state.ideas.filter(item => item.id !== id); queueMutation("ideas","delete",null,id); saveState(); renderIdeas(); showToast("Anotação excluída."); await syncPending();
}

function renderMore() {
  renderBills(); renderIdeas();
  const month = $("#budgetMonth").value || $("#dashboardMonth").value || currentMonth();
  $("#budgetMonth").value = month;
  $("#monthlyBudget").value = state.budgets[month] ? Number(state.budgets[month]).toFixed(2).replace(".",",") : "";
}
function onBudgetMonthChange() {
  const month = $("#budgetMonth").value || currentMonth();
  $("#monthlyBudget").value = state.budgets[month] ? Number(state.budgets[month]).toFixed(2).replace(".",",") : "";
}
async function saveSettings(event) {
  event.preventDefault();
  const month = $("#budgetMonth").value || currentMonth();
  const amount = Math.abs(parseMoney($("#monthlyBudget").value));
  state.budgets[month] = amount; queueMutation("budgets","upsert",{month,amount},month); saveState();
  $("#dashboardMonth").value = month; renderDashboard(); showToast("Orçamento mensal salvo."); await syncPending();
}
function exportBackup() {
  const blob = new Blob([JSON.stringify({...state,version:3,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `financas-backup-${today()}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url),1000); showToast("Backup exportado.");
}
async function restoreBackup(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!data || !Array.isArray(data.transactions)) throw new Error("Formato inválido");
    if (!(await askConfirmation("Restaurar backup", "Os dados sincronizados atuais serão substituídos pelo conteúdo do arquivo.", "Restaurar"))) return;
    const previous = state;
    state = normalizeState(data); state.sync.pending = [];
    previous.transactions.forEach(item => queueMutation("transactions","delete",null,item.id));
    previous.bills.forEach(item => queueMutation("bills","delete",null,item.id));
    previous.ideas.forEach(item => queueMutation("ideas","delete",null,item.id));
    Object.keys(previous.budgets).forEach(month => queueMutation("budgets","delete",null,month));
    state.transactions = state.transactions.map(item => ({...item,id:isUuid(item.id)?item.id:uid()}));
    state.bills = state.bills.map(item => ({...item,id:isUuid(item.id)?item.id:uid()}));
    state.ideas = state.ideas.map(item => ({...item,id:isUuid(item.id)?item.id:uid()}));
    state.transactions.forEach(item => queueMutation("transactions","upsert",item,item.id));
    state.bills.forEach(item => queueMutation("bills","upsert",item,item.id));
    state.ideas.forEach(item => queueMutation("ideas","upsert",item,item.id));
    Object.entries(state.budgets).forEach(([month,amount]) => queueMutation("budgets","upsert",{month,amount},month));
    saveState(); initializeValues(); renderAll(); showToast("Backup restaurado no cache. Sincronizando..."); await syncPending();
  } catch (error) { console.error(error); showToast("Arquivo de backup inválido.","error"); }
  finally { $("#restoreFile").value = ""; }
}
async function clearAllData() {
  if (!(await askConfirmation("Apagar todos os dados", "Esta ação excluirá os dados deste usuário no Supabase e nos dispositivos sincronizados.", "Apagar tudo"))) return;
  const previous = state; state = defaultState();
  previous.transactions.forEach(item => queueMutation("transactions","delete",null,item.id));
  previous.bills.forEach(item => queueMutation("bills","delete",null,item.id));
  previous.ideas.forEach(item => queueMutation("ideas","delete",null,item.id));
  Object.keys(previous.budgets).forEach(month => queueMutation("budgets","delete",null,month));
  saveState(); initializeValues(); renderAll(); showToast("Dados removidos do cache. Sincronizando exclusões..."); await syncPending();
}

function switchMoreTab(name) {
  $$("[data-more-tab]").forEach(button => button.classList.toggle("active",button.dataset.moreTab === name));
  $$(".more-panel").forEach(panel => panel.classList.toggle("active",panel.id === `more-${name}`));
}
function renderAll() { renderDashboard(); renderTransactions(); renderBills(); renderIdeas(); updateSyncStatus(); }
function initializeValues() {
  const month = $("#dashboardMonth").value || currentMonth();
  $("#dashboardMonth").value = month; $("#listMonth").value = $("#listMonth").value || month; $("#date").value = today(); $("#billDue").value = today();
  if ($("#budgetMonth")) { $("#budgetMonth").value = month; onBudgetMonthChange(); }
}

function isUuid(value) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||"")); }
async function deterministicUuid(value) {
  if (!globalThis.crypto?.subtle) return uid();
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes.slice(0,16)].map(byte => byte.toString(16).padStart(2,"0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}
function operationKey(table,id) { return `${table}:${id}`; }
function queueMutation(table,action,data,id) {
  const key = operationKey(table,id); const pending = state.sync.pending.filter(op => op.key !== key);
  pending.push({key,table,action,id,data,queuedAt:new Date().toISOString()}); state.sync.pending = pending;
}
function decodeSource(value) {
  try { const parsed = JSON.parse(value); if (parsed && parsed.app === "financas-pwa") return parsed; } catch (_) {}
  return {source:String(value || "manual"),notes:""};
}
function encodeSource(item) { return JSON.stringify({app:"financas-pwa",source:item.source || "manual",notes:item.notes || ""}); }
function toCloudRow(table,item) {
  const user_id = currentUserId();
  if (table === "transactions") return {id:item.id,user_id,transaction_date:item.date,description:item.description,category:item.category,type:item.type,payment_method:item.paymentMethod,amount:item.amount,source:encodeSource(item),created_at:item.createdAt};
  if (table === "bills") return {id:item.id,user_id,description:item.description,amount:item.amount,due_date:item.due,status:item.paid ? "paid" : "pending",created_at:item.createdAt};
  if (table === "ideas") return {id:item.id,user_id,text:item.text,created_at:item.createdAt};
  if (table === "budgets") return {user_id,month:`${item.month}-01`,amount:item.amount};
  return item;
}
function fromCloudTransaction(row) { const meta=decodeSource(row.source); return sanitizeTransaction({...row,date:row.transaction_date,paymentMethod:row.payment_method,source:meta.source,notes:meta.notes}); }
function fromCloudBill(row) { return sanitizeBill({...row,due:row.due_date,paid:row.status === "paid"}); }
function fromCloudIdea(row) { return sanitizeIdea(row); }
function mergePending(table,remoteItems) {
  const map = new Map(remoteItems.map(item => [String(item.id),item]));
  state.sync.pending.filter(op => op.table === table).forEach(op => { if (op.action === "delete") map.delete(String(op.id)); else map.set(String(op.id),op.data); });
  return [...map.values()];
}
function mergePendingBudgets(remote) {
  const result={...remote}; state.sync.pending.filter(op => op.table === "budgets").forEach(op => { if(op.action === "delete") delete result[op.id]; else result[op.id]=Number(op.data.amount)||0; }); return result;
}
function updateSyncStatus(message) {
  const dot=$("#syncDot"), text=$("#syncText"); if (!dot || !text) return;
  const pending=state.sync.pending.length;
  let label=message || (!navigator.onLine ? `Offline${pending ? ` • ${pending} pendente(s)` : ""}` : pending ? `${pending} alteração(ões) pendente(s)` : state.sync.lastSync ? "Sincronizado" : "Conectando...");
  text.textContent=label; dot.className=`sync-dot ${!navigator.onLine ? "offline" : pending ? "pending" : "online"}`;
}
async function applyOperation(op) {
  if (op.action === "delete") {
    let query=cloud.from(op.table).delete();
    query = op.table === "budgets" ? query.eq("user_id",currentUserId()).eq("month",`${op.id}-01`) : query.eq("id",op.id);
    const {error}=await query; if(error) throw error; return;
  }
  const row=toCloudRow(op.table,op.data);
  const options={onConflict:op.table === "budgets" ? "user_id,month" : "id"};
  const {error}=await cloud.from(op.table).upsert(row,options); if(error) throw error;
}
async function syncPending() {
  if (!cloud || !session || syncInProgress || !navigator.onLine) { updateSyncStatus(); return; }
  syncInProgress=true; updateSyncStatus("Sincronizando...");
  try {
    while (state.sync.pending.length) {
      const op=state.sync.pending[0]; await applyOperation(op);
      state.sync.pending.shift(); state.sync.lastSync=new Date().toISOString(); saveState();
    }
    updateSyncStatus("Sincronizado");
  } catch(error) {
    console.error("Falha de sincronização",error); updateSyncStatus("Pendente • tente novamente");
    if (navigator.onLine) showToast(`Não foi possível sincronizar: ${error.message || "verifique a conexão"}.`,"error");
  } finally { syncInProgress=false; saveState(); }
}
async function loadRemoteData({quiet=false}={}) {
  if (!cloud || !session || !navigator.onLine) return;
  if(!quiet) updateSyncStatus("Carregando nuvem...");
  const [transactions,budgets,bills,ideas]=await Promise.all([
    cloud.from("transactions").select("*").order("transaction_date",{ascending:false}),
    cloud.from("budgets").select("*"), cloud.from("bills").select("*").order("due_date",{ascending:true}),
    cloud.from("ideas").select("*").order("created_at",{ascending:false})
  ]);
  const failure=[transactions,budgets,bills,ideas].find(result => result.error); if(failure) throw failure.error;
  state.transactions=mergePending("transactions",transactions.data.map(fromCloudTransaction));
  state.bills=mergePending("bills",bills.data.map(fromCloudBill)); state.ideas=mergePending("ideas",ideas.data.map(fromCloudIdea));
  const cloudBudgets=Object.fromEntries(budgets.data.map(row => [String(row.month).slice(0,7),Number(row.amount)||0])); state.budgets=mergePendingBudgets(cloudBudgets);
  state.sync.lastSync=new Date().toISOString(); saveState(); renderAll();
}
function scheduleCloudRefresh() { clearTimeout(refreshTimer); refreshTimer=setTimeout(() => loadRemoteData({quiet:true}).catch(error => console.warn("Realtime refresh",error)),500); }
function setupRealtime() {
  if(realtimeChannel) cloud.removeChannel(realtimeChannel);
  realtimeChannel=cloud.channel(`financas-${currentUserId()}`).on("postgres_changes",{event:"*",schema:"public",filter:`user_id=eq.${currentUserId()}`},scheduleCloudRefresh).subscribe(status => {
    if(status === "SUBSCRIBED") updateSyncStatus();
  });
}
async function migrateLegacyData() {
  const count=legacyState.transactions.length+legacyState.bills.length+legacyState.ideas.length+Object.keys(legacyState.budgets).length;
  const marker=`${MIGRATION_PREFIX}:${currentUserId()}`;
  if(!count || localStorage.getItem(marker)) return;
  const accepted=await askConfirmation("Migrar dados deste dispositivo",`Foram encontrados ${count} item(ns) da versão local. Deseja copiá-los para sua conta sincronizada? Uma cópia de segurança local será preservada.`,"Migrar agora");
  if(!accepted) return;
  localStorage.setItem(`${LEGACY_STORAGE_KEY}_backup_${Date.now()}`,JSON.stringify(legacyState));
  const importedTransactions=legacyState.transactions.map(item => sanitizeTransaction({...item,id:uid(),updatedAt:new Date().toISOString()})).filter(item => !isDuplicate(item));
  const importedBills=legacyState.bills.map(item => sanitizeBill({...item,id:uid(),updatedAt:new Date().toISOString()}));
  const importedIdeas=legacyState.ideas.map(item => sanitizeIdea({...item,id:uid(),updatedAt:new Date().toISOString()}));
  state.transactions.push(...importedTransactions); state.bills.push(...importedBills); state.ideas.push(...importedIdeas); state.budgets={...legacyState.budgets,...state.budgets};
  importedTransactions.forEach(item => queueMutation("transactions","upsert",item,item.id)); importedBills.forEach(item => queueMutation("bills","upsert",item,item.id)); importedIdeas.forEach(item => queueMutation("ideas","upsert",item,item.id));
  Object.entries(legacyState.budgets).forEach(([month,amount]) => queueMutation("budgets","upsert",{month,amount},month));
  localStorage.setItem(marker,new Date().toISOString()); saveState(); renderAll(); showToast("Dados locais migrados para a fila segura de sincronização."); await syncPending();
}
function showAuthenticatedApp() {
  $("#authGate").classList.add("hidden"); $("#appShell").classList.remove("hidden");
  $("#userEmail").textContent=session?.user?.email || "Conta";
}
function showLogin() {
  $("#appShell").classList.add("hidden"); $("#authGate").classList.remove("hidden"); $("#authPassword").value=""; setLoading(false);
}
async function activateSession(nextSession) {
  session=nextSession;
  if(!session) { if(realtimeChannel && cloud) cloud.removeChannel(realtimeChannel); realtimeChannel=null; state=defaultState(); showLogin(); return; }
  state=loadUserState(currentUserId()); showAuthenticatedApp(); initializeValues(); renderAll();
  try { await syncPending(); await loadRemoteData(); await migrateLegacyData(); setupRealtime(); }
  catch(error) { console.error(error); showToast(`Cache aberto; nuvem indisponível: ${error.message || "verifique a conexão"}.`,"error"); updateSyncStatus(); }
}
async function signIn(event) {
  event.preventDefault(); const email=$("#authEmail").value.trim(); const password=$("#authPassword").value;
  if(!email || !password) return showToast("Informe e-mail e senha.","error");
  if(!cloud) return showToast("Cliente de sincronização indisponível. Conecte-se à internet e recarregue.","error");
  setLoading(true,"Entrando..."); const {data,error}=await cloud.auth.signInWithPassword({email,password}); setLoading(false);
  if(error) return showToast(`Não foi possível entrar: ${error.message}`,"error"); await activateSession(data.session);
}
async function signOut() {
  if(state.sync.pending.length && !(await askConfirmation("Sair com alterações pendentes",`${state.sync.pending.length} alteração(ões) ainda não foram enviadas. Elas permanecerão no cache deste dispositivo.`,"Sair"))) return;
  setLoading(true,"Saindo..."); const {error}=await cloud.auth.signOut(); setLoading(false); if(error) return showToast(error.message,"error"); showLogin();
}
async function initializeCloud() {
  if(!globalThis.supabase?.createClient) throw new Error("biblioteca do Supabase não carregou");
  cloud=globalThis.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true},realtime:{params:{eventsPerSecond:2}}});
  cloud.auth.onAuthStateChange((event,nextSession) => { if(event === "SIGNED_OUT") activateSession(null); else if(event === "TOKEN_REFRESHED") session=nextSession; });
  const {data,error}=await cloud.auth.getSession(); if(error) throw error; await activateSession(data.session);
}

function bindEvents() {
  $$("[data-nav]").forEach(button => button.addEventListener("click",() => navigate(button.dataset.nav)));
  $$('[data-go]').forEach(button => button.addEventListener("click",() => navigate(button.dataset.go)));
  $$(".segment").forEach(button => button.addEventListener("click",() => setTransactionType(button.dataset.type)));
  $("#transactionForm").addEventListener("submit",onTransactionSubmit);
  $("#cancelEditBtn").addEventListener("click",resetTransactionForm);
  $("#dashboardMonth").addEventListener("change",() => { renderDashboard(); if ($("#budgetMonth")) { $("#budgetMonth").value=$("#dashboardMonth").value; onBudgetMonthChange(); } });
  ["#listMonth","#filterType","#filterCategory"].forEach(selector => $(selector).addEventListener("change",renderTransactions));
  $("#searchTransactions").addEventListener("input",renderTransactions);
  $("#transactionList").addEventListener("click",event => { const edit = event.target.closest("[data-edit]"); const remove = event.target.closest("[data-delete]"); if (edit) editTransaction(edit.dataset.edit); if (remove) deleteTransaction(remove.dataset.delete); });
  $("#importFile").addEventListener("change",event => analyzeFiles([...event.target.files]));
  $("#analyzeTextBtn").addEventListener("click",() => { const text = $("#pasteText").value.trim(); if (!text) return showToast("Cole o conteúdo do extrato antes de analisar.","error"); const parsed = parseImportText(text,"texto-colado"); prepareImport(parsed); parsed.length ? showToast(`${parsed.length} lançamento(s) encontrado(s).`) : showToast("Nenhum lançamento reconhecido. Use uma linha por lançamento com data, descrição e valor.","error"); });
  $("#importPreview").addEventListener("change",updatePreviewItem); $("#importPreview").addEventListener("input",updatePreviewItem);
  $("#cancelImportBtn").addEventListener("click",cancelImport); $("#confirmImportBtn").addEventListener("click",confirmImport);
  const drop = $("#dropZone"); ["dragenter","dragover"].forEach(type => drop.addEventListener(type,event => {event.preventDefault();drop.classList.add("dragover");})); ["dragleave","drop"].forEach(type => drop.addEventListener(type,event => {event.preventDefault();drop.classList.remove("dragover");})); drop.addEventListener("drop",event => analyzeFiles([...event.dataTransfer.files]));
  $$("[data-more-tab]").forEach(button => button.addEventListener("click",() => switchMoreTab(button.dataset.moreTab)));
  $("#billForm").addEventListener("submit",onBillSubmit); $("#billList").addEventListener("click",event => {const button=event.target.closest("[data-bill-pay],[data-bill-delete]"); if(button) handleBillAction(button);});
  $("#ideaForm").addEventListener("submit",onIdeaSubmit); $("#ideaList").addEventListener("click",event => {const button=event.target.closest("[data-idea-delete]"); if(button) deleteIdea(button.dataset.ideaDelete);});
  $("#settingsForm").addEventListener("submit",saveSettings); $("#budgetMonth").addEventListener("change",onBudgetMonthChange); $("#exportBtn").addEventListener("click",exportBackup); $("#restoreFile").addEventListener("change",event => restoreBackup(event.target.files[0])); $("#clearBtn").addEventListener("click",clearAllData);
  $("#authForm").addEventListener("submit",signIn); $("#logoutBtn").addEventListener("click",signOut); $("#retrySyncBtn").addEventListener("click",async() => { await syncPending(); await loadRemoteData().catch(error => showToast(error.message,"error")); });
  window.addEventListener("online",async() => { updateSyncStatus(); await syncPending(); await loadRemoteData({quiet:true}).catch(error => console.warn(error)); }); window.addEventListener("offline",updateSyncStatus);
  window.addEventListener("beforeinstallprompt",event => {event.preventDefault();deferredInstallPrompt=event;$("#installBtn").classList.remove("hidden");});
  $("#installBtn").addEventListener("click",async() => {if(!deferredInstallPrompt)return;deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;$("#installBtn").classList.add("hidden");});
  window.addEventListener("appinstalled",() => showToast("Aplicativo instalado."));
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(error => console.warn("Service worker não registrado",error));
  if (location.protocol === "file:") $("#pdfHint").textContent = "CSV e TXT funcionam neste arquivo. Para PDF, instalação e modo offline, publique a pasta em HTTPS e abra pelo Safari.";
}

async function init() {
  populateCategories(); bindEvents(); registerServiceWorker();
  const initial = location.hash.slice(1); navigate(["dashboard","add","transactions","import","more"].includes(initial) ? initial : "dashboard");
  try { await initializeCloud(); }
  catch(error) { console.error(error); showLogin(); $("#authMessage").textContent="Não foi possível carregar o login. Verifique a internet e recarregue a página."; }
}

window.__financeTest = {parseMoney,normalizeDate,guessCategory,parseImportText,isDuplicate,sanitizeTransaction,normalizeState,deterministicUuid,toCloudRow};
init();
