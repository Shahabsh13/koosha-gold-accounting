// @ts-nocheck
/* Global defaults for inline HTML listeners */
window.customersActiveBranch = 'main';

/* ============ persistence (localStorage acting as local DB) ============ */
const DB_KEYS = {
  customers: 'gold_customers',
  inventory: 'gold_inventory',
  invoices: 'gold_invoices',
  settings: 'gold_settings',
  log: 'gold_synclog',
  financialAccounts: 'gold_financial_accounts',
  checks: 'gold_checks',
  financialTransactions: 'gold_financial_transactions',
  coaNodes: 'gold_coa_nodes',
  genericDetails: 'gold_generic_details',
  coaVersion: 'gold_coa_version',
  expensesIncomes: 'gold_expenses_incomes',
  customCategories: 'gold_custom_categories',
  manualJournals: 'gold_manual_journals'
};

function load(key, fallback){
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch(e) {
    return fallback;
  }
}
function save(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function uuid(){
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16|0;
    const v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}
function nowISO(){ return new Date().toISOString(); }

/* --- Number helpers & Persian numeral parser --- */
function toEn(str){
  if(str == null) return '';
  const fa = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  const ar = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  let s = String(str);
  for(let i = 0; i < 10; i++){
    s = s.replaceAll(fa[i], String(i)).replaceAll(ar[i], String(i));
  }
  return s;
}

function currencyValue(el){
  if(!el) return 0;
  const val = typeof el === 'string' ? el : (el.value || '');
  const en = toEn(val).replace(/[^\d]/g, '');
  return Number(en) || 0;
}

function formatCurrencyInput(el){
  if(!el) return;
  const originalVal = el.value;
  const posFromEnd = originalVal.length - (el.selectionStart || originalVal.length);
  const num = currencyValue(el);
  el.value = num ? num.toLocaleString('en-US') : '';
  const newPos = Math.max(0, el.value.length - posFromEnd);
  try { el.setSelectionRange(newPos, newPos); } catch(e){}
}

function fmtMoneyInput(n){
  const num = Number(n || 0);
  return num ? num.toLocaleString('en-US') : '';
}

function fmtMoney(n: any): string {
  if(n === null || n === undefined || n === '') return '۰';
  let num: number;
  if(typeof n === 'string'){
    num = parseFloat(n.replace(/,/g, '').trim());
  } else {
    num = Number(n);
  }
  if(isNaN(num)) return '۰';
  return Math.round(num).toLocaleString('fa-IR');
}

function toFa(n){
  return Number(n || 0).toLocaleString('fa-IR');
}

function toFaDate(dateStr?: string | Date | null): string {
  if(!dateStr) return '—';
  try {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    if(isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('fa-IR');
  } catch(e) {
    return String(dateStr || '—');
  }
}

function toDateInputValue(isoOrDate){
  const d = isoOrDate ? new Date(isoOrDate) : new Date();
  if(isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toGrams(value, unit){
  return unit === 'sut' ? Number(value || 0) / 1000 : Number(value || 0);
}

function toast(msg: string, type?: 'error' | 'success' | 'info' | 'warn'){
  let wrap = document.getElementById('toast-wrap');
  if(!wrap){
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }

  let effectiveType = type;
  if(!effectiveType){
    const lower = String(msg || '').toLowerCase();
    const isError = lower.includes('خطا') || 
                    lower.includes('وارد کنید') || 
                    lower.includes('الزامی') || 
                    lower.includes('نمی‌تواند') || 
                    lower.includes('معتبر نیست') || 
                    lower.includes('نامعتبر') || 
                    lower.includes('قبلاً ثبت شده') || 
                    lower.includes('یافت نشد') || 
                    lower.includes('انتخاب کنید') || 
                    lower.includes('مجاز نیست') || 
                    lower.includes('هشدار') || 
                    lower.includes('باید') ||
                    lower.includes('لطفاً');
    const isSuccess = lower.includes('با موفقیت') || 
                      lower.includes('ذخیره شد') || 
                      lower.includes('بروزرسانی شد') || 
                      lower.includes('حذف شد') || 
                      lower.includes('ایجاد شد');
    if(isError) effectiveType = 'error';
    else if(isSuccess) effectiveType = 'success';
    else effectiveType = 'info';
  }

  const el = document.createElement('div');
  el.className = `toast toast-${effectiveType === 'warn' ? 'error' : effectiveType}`;
  
  const icon = (effectiveType === 'error' || effectiveType === 'warn') ? '⚠️' : (effectiveType === 'success' ? '✅' : 'ℹ️');
  el.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span style="flex:1; line-height:1.45;">${msg}</span>
  `;

  wrap.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(-10px)';
    el.style.transition = 'all 0.2s ease-out';
    setTimeout(() => el.remove(), 220);
  }, 3800);
}

function syncModalOpenState(){
  const overlays = document.querySelectorAll('.modal-overlay');
  let hasOpenModal = false;
  overlays.forEach(el => {
    const htmlEl = el as HTMLElement;
    if(htmlEl && htmlEl.style.display !== 'none' && window.getComputedStyle(htmlEl).display !== 'none'){
      hasOpenModal = true;
    }
  });
  if(hasOpenModal){
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
}

/* ============ custom in-app confirm modal (iframe-safe) ============ */
interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  danger?: boolean;
  icon?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

let activeConfirmCallback: ((confirmed: boolean) => void) | null = null;

function showConfirmModal(options: ConfirmOptions){
  const modal = document.getElementById('app-confirm-modal');
  if(!modal){
    if(options.onConfirm) options.onConfirm();
    return;
  }
  const titleEl = document.getElementById('confirm-modal-title');
  const msgEl = document.getElementById('confirm-modal-message');
  const okBtn = document.getElementById('confirm-modal-ok-btn') as HTMLButtonElement | null;
  const cancelBtn = document.getElementById('confirm-modal-cancel-btn') as HTMLButtonElement | null;
  const iconEl = document.getElementById('confirm-modal-icon');

  const danger = Boolean(options.isDanger || options.danger);

  if(titleEl) titleEl.textContent = options.title || 'تأیید عملیات';
  if(msgEl) msgEl.textContent = options.message;
  if(iconEl) iconEl.textContent = options.icon || (danger ? '🗑️' : '⚠️');
  
  if(okBtn){
    okBtn.textContent = options.confirmText || (danger ? 'تأیید و حذف' : 'تأیید');
    okBtn.style.background = danger ? '#dc2626' : 'var(--gold)';
    okBtn.style.color = danger ? '#ffffff' : '#000000';
  }
  if(cancelBtn) cancelBtn.textContent = options.cancelText || 'انصراف';

  activeConfirmCallback = (confirmed: boolean) => {
    modal.style.display = 'none';
    syncModalOpenState();
    if(confirmed){
      if(options.onConfirm) options.onConfirm();
    } else {
      if(options.onCancel) options.onCancel();
    }
  };

  modal.style.display = 'flex';
  syncModalOpenState();
}

const confirmModal = showConfirmModal;

function closeConfirmModal(confirmed: boolean){
  if(activeConfirmCallback){
    const cb = activeConfirmCallback;
    activeConfirmCallback = null;
    cb(confirmed);
  } else {
    const modal = document.getElementById('app-confirm-modal');
    if(modal) modal.style.display = 'none';
  }
}

/* ============ custom in-app prompt modal (iframe-safe) ============ */
interface PromptOptions {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  onConfirm: (value: string) => void;
  onCancel?: () => void;
}

let activePromptCallback: ((value: string | null) => void) | null = null;

function showPromptModal(options: PromptOptions){
  const modal = document.getElementById('app-prompt-modal');
  if(!modal){
    const res = prompt(options.message || options.title || '', options.defaultValue || '');
    if(res !== null && options.onConfirm) options.onConfirm(res.trim());
    return;
  }
  const titleEl = document.getElementById('prompt-modal-title');
  const msgEl = document.getElementById('prompt-modal-message');
  const inp = document.getElementById('prompt-modal-input') as HTMLInputElement | null;
  const okBtn = document.getElementById('prompt-modal-ok-btn') as HTMLButtonElement | null;
  const iconEl = document.getElementById('prompt-modal-icon');

  if(titleEl) titleEl.textContent = options.title || 'ویرایش عنوان';
  if(msgEl) msgEl.textContent = options.message || '';
  if(iconEl) iconEl.textContent = options.icon || '✏️';
  if(okBtn) okBtn.textContent = options.confirmText || 'ذخیره و تأیید';

  if(inp){
    inp.value = options.defaultValue || '';
    inp.placeholder = options.placeholder || 'عنوان را وارد کنید...';
  }

  activePromptCallback = (val: string | null) => {
    modal.style.display = 'none';
    if(val !== null){
      if(options.onConfirm) options.onConfirm(val);
    } else {
      if(options.onCancel) options.onCancel();
    }
  };

  modal.style.display = 'flex';
  setTimeout(() => {
    if(inp){
      inp.focus();
      inp.select();
    }
  }, 50);
}

function confirmPromptModal(){
  const inp = document.getElementById('prompt-modal-input') as HTMLInputElement | null;
  const val = inp ? inp.value.trim() : '';
  if(!val){
    toast('لطفاً عنوان یا نام معتبر وارد کنید', 'error');
    return;
  }
  closePromptModal(val);
}

function closePromptModal(val: string | null){
  if(activePromptCallback){
    const cb = activePromptCallback;
    activePromptCallback = null;
    cb(val);
  } else {
    const modal = document.getElementById('app-prompt-modal');
    if(modal) modal.style.display = 'none';
  }
}

/* ============ chart of accounts (COA) hierarchy ============ */
const COA_VERSION = 7;

function seedCOA(){
  const nodes = [];
  function addNode(parentId, code, name, opts){
    const n = Object.assign({
      id: uuid(),
      parentId,
      code,
      name,
      locked: true,
      allowAddChild: false,
      isBalanceSheetRoot: false,
      childMode: null,
      attachType: null,
      closed: false,
      natureOverride: null,
      financialType: null,
      unit: null
    }, opts || {});
    nodes.push(n);
    return n;
  }

  // ===================== 1. دارایی‌ها (ASSETS) =====================
  const g1 = addNode(null, '1', 'دارایی‌ها', { nature: 'debit', isBalanceSheetRoot: true, allowAddChild: false });

  // 1.01 دارایی‌های جاری (Current Assets) -> Strictly locked for Balance Sheet integrity
  const k101 = addNode(g1.id, '1.01', 'دارایی‌های جاری', { allowAddChild: false, isBalanceSheetRoot: true });

  // 1.01.01 موجودی نقد و بانک -> Closed/System attached to financial accounts
  const m10101 = addNode(k101.id, '1.01.01', 'موجودی نقد و بانک', { allowAddChild: false, closed: true });
  addNode(m10101.id, '1.01.01.01', 'صندوق', { attachType: 'financial', financialType: 'cash', closed: true, allowAddChild: false });
  addNode(m10101.id, '1.01.01.02', 'بانک‌ها و کارتخوان‌ها', { attachType: 'financial', financialType: 'bank', closed: true, allowAddChild: false });

  // 1.01.02 حساب‌های دریافتنی (اشخاص) -> 3 Main Groups: اشخاص, سایر اشخاص, پرسنل
  const m10102 = addNode(k101.id, '1.01.02', 'حساب‌های دریافتنی (اشخاص)', { allowAddChild: false, isBalanceSheetRoot: true });
  const custGroupMain = addNode(m10102.id, '1.01.02.01', 'اشخاص', { attachType: 'customer', natureOverride: 'both', childMode: 'category', allowAddChild: true, locked: true });
  addNode(custGroupMain.id, '1.01.02.01.01', 'اشخاص', { attachType: 'customer', natureOverride: 'both', childMode: null, allowAddChild: false, locked: false, isPermanentMoein: true });

  const custGroupOther = addNode(m10102.id, '1.01.02.02', 'سایر اشخاص', { attachType: 'customer', natureOverride: 'both', childMode: 'category', allowAddChild: true, locked: true });
  addNode(custGroupOther.id, '1.01.02.02.01', 'سایر اشخاص', { attachType: 'customer', natureOverride: 'both', childMode: null, allowAddChild: false, locked: false, isPermanentMoein: true });

  const custGroupStaff = addNode(m10102.id, '1.01.02.03', 'پرسنل', { attachType: 'customer', natureOverride: 'both', childMode: 'category', allowAddChild: true, locked: true });
  addNode(custGroupStaff.id, '1.01.02.03.01', 'پرسنل', { attachType: 'customer', natureOverride: 'both', childMode: null, allowAddChild: false, locked: false, isPermanentMoein: true });

  // 1.01.03 اسناد دریافتنی -> System-managed via Checks
  const m10103 = addNode(k101.id, '1.01.03', 'اسناد دریافتنی (چک‌های اشخاص)', { allowAddChild: false, closed: true });
  addNode(m10103.id, '1.01.03.01', 'چک‌های نزد صندوق', { attachType: 'financial', financialType: 'cash', closed: true, allowAddChild: false });
  addNode(m10103.id, '1.01.03.02', 'چک‌های در جریان وصول نزد بانک', { attachType: 'financial', financialType: 'bank', closed: true, allowAddChild: false });

  // 1.01.04 موجودی کالا -> ALLOWS custom inventory categories directly under کالا
  const m10104 = addNode(k101.id, '1.01.04', 'موجودی کالا (انبار طلا و جواهر)', { allowAddChild: false, isBalanceSheetRoot: true });
  addNode(m10104.id, '1.01.04.01', 'کالا (انبار طلا و مصنوعات)', { attachType: 'item', locked: true, childMode: 'category', allowAddChild: true });

  // 1.01.05 حساب جاری طلای اشخاص (طلب وزنی) -> System automated balance
  addNode(k101.id, '1.01.05', 'حساب جاری طلای اشخاص (طلب وزنی به گرم ۱۸)', { closed: true, unit: 'gram', allowAddChild: false });
  // 1.01.06 پیش‌پرداخت‌ها -> Balance Sheet
  addNode(k101.id, '1.01.06', 'پیش‌پرداخت‌ها و علی‌الحساب‌ها', { closed: true, allowAddChild: false });
  // 1.01.07 مالیات و عوارض خرید -> System
  addNode(k101.id, '1.01.07', 'مالیات و عوارض ارزش افزوده خرید (بستانکاری مالیاتی)', { closed: true, allowAddChild: false });

  // 1.02 دارایی‌های غیرجاری (Non-Current Assets) -> Strictly locked at Kol level
  const k102 = addNode(g1.id, '1.02', 'دارایی‌های غیرجاری', { allowAddChild: false, isBalanceSheetRoot: true });
  // 1.02.01 دارایی‌های ثابت مشهود -> ALLOWS custom fixed asset categories
  const m10201 = addNode(k102.id, '1.02.01', 'دارایی‌های ثابت مشهود (تجهیزات، گاوصندوق و ویترین)', { childMode: 'category', allowAddChild: true });
  addNode(m10201.id, '1.02.01.01', 'گاوصندوق و سیستم‌های ایمنی و ضدسرقت', { allowAddChild: false });
  addNode(m10201.id, '1.02.01.02', 'ویترین، دکوراسیون و مبلمان فروشگاه', { allowAddChild: false });
  addNode(m10201.id, '1.02.01.03', 'ترازوهای زرگری، بوته و تجهیزات ری‌گیری', { allowAddChild: false });
  // 1.02.02 استهلاک انباشته
  addNode(k102.id, '1.02.02', 'استهلاک انباشته دارایی‌های ثابت', { closed: true, natureOverride: 'credit', allowAddChild: false });

  // ===================== 2. بدهی‌ها (LIABILITIES) =====================
  const g2 = addNode(null, '2', 'بدهی‌ها', { nature: 'credit', isBalanceSheetRoot: true, allowAddChild: false });

  // 2.01 بدهی‌های جاری (Current Liabilities) -> Strictly locked for Balance Sheet integrity
  const k201 = addNode(g2.id, '2.01', 'بدهی‌های جاری', { allowAddChild: false, isBalanceSheetRoot: true });
  // 2.01.01 حساب‌های پرداختنی تجاری -> ALLOWS custom supplier categories
  const m20101 = addNode(k201.id, '2.01.01', 'حساب‌های پرداختنی تجاری (بستانکاران و تامین‌کنندگان)', { childMode: 'category', allowAddChild: true });
  addNode(m20101.id, '2.01.01.01', 'تامین‌کنندگان طلا و بنکداران', { attachType: 'customer', natureOverride: 'both', childMode: 'category', allowAddChild: false });
  // 2.01.02 اسناد پرداختنی (چک‌های صادره) -> System
  addNode(k201.id, '2.01.02', 'اسناد پرداختنی (چک‌های صادره فروشگاه)', { closed: true, allowAddChild: false });
  // 2.01.03 حساب جاری طلای اشخاص (بدهی وزنی) -> System
  addNode(k201.id, '2.01.03', 'حساب جاری طلای اشخاص (بدهی وزنی به گرم ۱۸)', { closed: true, unit: 'gram', allowAddChild: false });
  // 2.01.04 مالیات و عوارض پرداختنی
  addNode(k201.id, '2.01.04', 'مالیات و عوارض ارزش افزوده فروش (بدهی به دارایی)', { closed: true, allowAddChild: false });
  // 2.01.05 پیش‌دریافت‌ها
  addNode(k201.id, '2.01.05', 'پیش‌دریافت‌ها و بیعانه‌های مشتریان', { closed: true, allowAddChild: false });

  // 2.02 بدهی‌های غیرجاری (Non-Current Liabilities)
  const k202 = addNode(g2.id, '2.02', 'بدهی‌های غیرجاری (بلندمدت)', { allowAddChild: false, isBalanceSheetRoot: true });
  addNode(k202.id, '2.02.01', 'تسهیلات و وام‌های دریافتی بلندمدت', { closed: true, allowAddChild: false });

  // ===================== 3. حقوق مالکانه و سرمایه (EQUITY) =====================
  const g3 = addNode(null, '3', 'حقوق مالکانه و سرمایه', { nature: 'credit', isBalanceSheetRoot: true, allowAddChild: false });
  addNode(g3.id, '3.01', 'سرمایه اولیه و پرداخت‌شده', { closed: true, allowAddChild: false });
  addNode(g3.id, '3.02', 'برداشت شخصی صاحبان فروشگاه', { closed: true, allowAddChild: false });
  addNode(g3.id, '3.03', 'سود و زیان انباشته سنوات قبل', { closed: true, allowAddChild: false });
  addNode(g3.id, '3.04', 'سود و زیان جاری دوره مالی', { closed: true, allowAddChild: false });

  // ===================== 4. درآمدها (REVENUE) =====================
  const g4 = addNode(null, '4', 'درآمدها', { nature: 'credit', isBalanceSheetRoot: false, allowAddChild: false });
  const k401 = addNode(g4.id, '4.01', 'فروش و درآمدهای عملیاتی طلا', { allowAddChild: false });
  addNode(k401.id, '4.01.01', 'درآمد فروش اصل طلا و مصنوعات', { closed: true, allowAddChild: false });
  addNode(k401.id, '4.01.02', 'درآمد اجرت ساخت و کارمزد', { closed: true, allowAddChild: false });
  addNode(k401.id, '4.01.03', 'درآمد سود مصوب فروشگاه (۷٪)', { closed: true, allowAddChild: false });

  const k402 = addNode(g4.id, '4.02', 'سایر درآمدها و خدمات زرگری', { childMode: 'category', allowAddChild: true });
  addNode(k402.id, '4.02.01', 'درآمد خدمات تعمیرات و جوشکاری طلا', { allowAddChild: false });
  addNode(k402.id, '4.02.02', 'درآمد خدمات آبکاری و پرداخت طلا', { allowAddChild: false });

  // ===================== 5. بهای تمام‌شده (COGS) =====================
  const g5 = addNode(null, '5', 'بهای تمام‌شده', { nature: 'debit', isBalanceSheetRoot: false, allowAddChild: false });
  const k501 = addNode(g5.id, '5.01', 'خرید و بهای تمام‌شده کالای فروش‌رفته', { allowAddChild: false });
  addNode(k501.id, '5.01.01', 'خرید طلای متفرقه و کهنه از مشتریان', { closed: true, allowAddChild: false });
  addNode(k501.id, '5.01.02', 'اجرت ساخت و کارمزد پرداختی به طلاساز', { closed: true, allowAddChild: false });

  // ===================== 6. هزینه‌ها (EXPENSES) =====================
  const g6 = addNode(null, '6', 'هزینه‌ها', { nature: 'debit', isBalanceSheetRoot: false, allowAddChild: false });
  const k601 = addNode(g6.id, '6.01', 'هزینه‌های عمومی، اداری و فروشگاه', { childMode: 'category', allowAddChild: true });
  addNode(k601.id, '6.01.01', 'اجاره‌بها و شارژ مجتمع تجاری', { allowAddChild: false });
  addNode(k601.id, '6.01.02', 'حقوق، دستمزد و پاداش پرسنل', { allowAddChild: false });
  addNode(k601.id, '6.01.03', 'کارمزد و هزینه‌های خدمات بانکی و دستگاه پوز', { allowAddChild: false });
  addNode(k601.id, '6.01.04', 'قبوض آب، برق، گاز، تلفن و اینترنت', { allowAddChild: false });
  addNode(k601.id, '6.01.05', 'بسته‌بندی، جعبه، پاکت و روبان طلا', { allowAddChild: false });
  addNode(k601.id, '6.01.06', 'تبلیغات، تابلو و بازاریابی', { allowAddChild: false });
  addNode(k601.id, '6.01.07', 'پذیرایی، چای و ملزومات مصرفی', { allowAddChild: false });
  addNode(k601.id, '6.01.08', 'بیمه، عوارض شهرداری و اتحادیه طلا', { allowAddChild: false });

  // ===================== 7. حساب‌های انتظامی (MEMO) =====================
  const g7 = addNode(null, '7', 'حساب‌های انتظامی', { nature: 'memo', isBalanceSheetRoot: false, allowAddChild: false });
  const k701 = addNode(g7.id, '7.01', 'حساب‌های انتظامی', { allowAddChild: false });
  addNode(k701.id, '7.01.01', 'اسناد تضمینی و امانی دریافتی', { closed: true, allowAddChild: false });
  addNode(k701.id, '7.01.02', 'اسناد تضمینی و امانی پرداختی', { closed: true, allowAddChild: false });

  return nodes;
}

const savedCoaVersion = load(DB_KEYS.coaVersion, 0);
let loadedCoaNodes, loadedGenericDetails;
if(savedCoaVersion !== COA_VERSION){
  loadedCoaNodes = seedCOA();
  loadedGenericDetails = [];
  save(DB_KEYS.coaNodes, loadedCoaNodes);
  save(DB_KEYS.genericDetails, loadedGenericDetails);
  save(DB_KEYS.coaVersion, COA_VERSION);
  const custs = load(DB_KEYS.customers, []);
  const mainRoot = loadedCoaNodes.find(n => n.code === '1.01.02.01');
  const otherRoot = loadedCoaNodes.find(n => n.code === '1.01.02.02');
  const staffRoot = loadedCoaNodes.find(n => n.code === '1.01.02.03');
  custs.forEach(c => {
    if(!c.branch || (c.branch !== 'other' && c.branch !== 'staff')) c.branch = 'main';
    if(c.branch === 'staff' && staffRoot) c.parentNodeId = staffRoot.id;
    else if(c.branch === 'other' && otherRoot) c.parentNodeId = otherRoot.id;
    else if(mainRoot) c.parentNodeId = mainRoot.id;
  });
  save(DB_KEYS.customers, custs);
  const items = load(DB_KEYS.inventory, []);
  const itemRoot = loadedCoaNodes.find(n => n.code === '1.01.04.01');
  items.forEach(it => {
    if(itemRoot) it.parentNodeId = itemRoot.id;
  });
  save(DB_KEYS.inventory, items);
} else {
  loadedCoaNodes = load(DB_KEYS.coaNodes, null) || seedCOA();
  loadedGenericDetails = load(DB_KEYS.genericDetails, []);
}

let db = {
  customers: load(DB_KEYS.customers, []),
  inventory: load(DB_KEYS.inventory, []),
  invoices: load(DB_KEYS.invoices, []),
  settings: load(DB_KEYS.settings, {
    price18: 42000000,
    profit: 7,
    tax: 10,
    price18UpdatedAt: nowISO(),
    nextDocumentNumber: 1001,
    fiscalYearStart: null
  }),
  log: load(DB_KEYS.log, []),
  coaNodes: loadedCoaNodes,
  genericDetails: loadedGenericDetails,
  financialAccounts: load(DB_KEYS.financialAccounts, []),
  checks: load(DB_KEYS.checks, []),
  financialTransactions: load(DB_KEYS.financialTransactions, []),
  expensesIncomes: load(DB_KEYS.expensesIncomes, []),
  customCategories: load(DB_KEYS.customCategories, { expense: [], income: [] }),
  manualJournals: load(DB_KEYS.manualJournals, [])
};

function persist(part){
  save(DB_KEYS[part], db[part]);
}

const PERMANENT_CUSTOMER_MOEIN_CODES = ['1.01.02.01.01', '1.01.02.02.01', '1.01.02.03.01'];
function isPermanentCustomerMoein(node){
  if(!node) return false;
  return Boolean((node as any).isPermanentMoein || PERMANENT_CUSTOMER_MOEIN_CODES.includes(node.code));
}

function ensureCustomerBranchesAndMoeins(){
  const branchConfigs = [
    { code: '1.01.02.01', childCode: '1.01.02.01.01', defaultName: 'اشخاص' },
    { code: '1.01.02.02', childCode: '1.01.02.02.01', defaultName: 'سایر اشخاص' },
    { code: '1.01.02.03', childCode: '1.01.02.03.01', defaultName: 'پرسنل' },
  ];
  let coaChanged = false;
  branchConfigs.forEach(b => {
    const root = db.coaNodes.find(n => n.code === b.code);
    if(root){
      let defaultMoein = db.coaNodes.find(n => n.code === b.childCode);
      if(!defaultMoein){
        defaultMoein = {
          id: uuid(),
          parentId: root.id,
          code: b.childCode,
          name: b.defaultName,
          locked: false,
          isPermanentMoein: true,
          allowAddChild: false,
          isBalanceSheetRoot: false,
          childMode: null,
          attachType: 'customer',
          closed: false,
          natureOverride: root.natureOverride || null,
          financialType: null,
          unit: null
        } as any;
        db.coaNodes.push(defaultMoein);
        coaChanged = true;
      } else {
        if(!(defaultMoein as any).isPermanentMoein || defaultMoein.parentId !== root.id){
          (defaultMoein as any).isPermanentMoein = true;
          defaultMoein.parentId = root.id;
          defaultMoein.attachType = 'customer';
          coaChanged = true;
        }
      }
    }
  });
  if(coaChanged) persist('coaNodes');

  let custChanged = false;
  (db.customers || []).forEach(c => {
    const branch = c.branch || 'main';
    const root = (branch === 'staff' ? db.coaNodes.find(n => n.code === '1.01.02.03') : (branch === 'other' ? db.coaNodes.find(n => n.code === '1.01.02.02') : db.coaNodes.find(n => n.code === '1.01.02.01')));
    if(root && (!c.parentNodeId || c.parentNodeId === root.id || !db.coaNodes.some(n => n.id === c.parentNodeId))){
      const defaultMoein = db.coaNodes.find(n => n.parentId === root.id);
      if(defaultMoein){
        c.parentNodeId = defaultMoein.id;
        custChanged = true;
      }
    }
  });
  if(custChanged) persist('customers');
}

ensureCustomerBranchesAndMoeins();

function nextCustomerCode(branch?: string): string {
  const b = branch || 'main';
  const prefixStart = b === 'staff' ? 3001 : b === 'other' ? 2001 : 1001;
  const prefixEnd = b === 'staff' ? 3999 : b === 'other' ? 2999 : 1999;
  
  const existingCodes = (db.customers || [])
    .map(c => parseInt(toEn(String(c.code || '')), 10))
    .filter(num => !isNaN(num) && num >= prefixStart && num <= prefixEnd);
  
  if(existingCodes.length === 0) return String(prefixStart);
  const max = Math.max(...existingCodes);
  return String(max + 1);
}

function nextItemCode(): string {
  const prefixStart = 2001;
  const existingCodes = (db.inventory || [])
    .map(i => parseInt(toEn(String(i.code || '')), 10))
    .filter(num => !isNaN(num) && num >= prefixStart);
  
  if(existingCodes.length === 0) return String(prefixStart);
  const max = Math.max(...existingCodes);
  return String(max + 1);
}

function nextAccountCode(type?: string): string {
  const isBank = type === 'bank';
  const prefixStart = isBank ? 201 : 101;
  const prefixEnd = isBank ? 299 : 199;
  const existingCodes = (db.financialAccounts || [])
    .map(a => parseInt(toEn(String(a.code || '')), 10))
    .filter(num => !isNaN(num) && num >= prefixStart && num <= prefixEnd);
  
  if(existingCodes.length === 0) return String(prefixStart);
  const max = Math.max(...existingCodes);
  return String(max + 1);
}

function ensureAllEntitiesCodingAndHierarchy(){
  let custChanged = false;
  const usedCustCodes = new Set<string>();
  (db.customers || []).forEach(c => {
    let codeStr = toEn(String(c.code || '')).trim();
    if(!codeStr || usedCustCodes.has(codeStr)){
      codeStr = nextCustomerCode(c.branch);
      c.code = codeStr;
      custChanged = true;
    }
    usedCustCodes.add(codeStr);
  });
  if(custChanged) persist('customers');

  let itemChanged = false;
  const usedItemCodes = new Set<string>();
  (db.inventory || []).forEach(i => {
    let codeStr = toEn(String(i.code || '')).trim();
    if(!codeStr || usedItemCodes.has(codeStr)){
      codeStr = nextItemCode();
      i.code = codeStr;
      itemChanged = true;
    }
    usedItemCodes.add(codeStr);
  });
  if(itemChanged) persist('inventory');

  let accChanged = false;
  const usedAccCodes = new Set<string>();
  (db.financialAccounts || []).forEach(a => {
    let codeStr = toEn(String(a.code || '')).trim();
    if(!codeStr || usedAccCodes.has(codeStr)){
      codeStr = nextAccountCode(a.type);
      a.code = codeStr;
      accChanged = true;
    }
    usedAccCodes.add(codeStr);
  });
  if(accChanged) persist('financialAccounts');
}

ensureAllEntitiesCodingAndHierarchy();

function nodeById(id){ return db.coaNodes.find(n => n.id === id); }
function nodeChildren(node){ return db.coaNodes.filter(n => n.parentId === node.id); }
function setNodeChildMode(node, mode){ node.childMode = mode; persist('coaNodes'); }
function nodeGenericDetails(node){ return db.genericDetails.filter(d => d.parentId === node.id); }
function nodeItems(node){ return db.inventory.filter(i => i.parentNodeId === node.id); }
function nodeCustomers(node){ return db.customers.filter(c => c.parentNodeId === node.id); }
function nodeFinancialAccounts(node){
  if(node.attachType !== 'financial') return [];
  return db.financialAccounts.filter(a => a.type === node.financialType);
}

function nextChildCode(parentCode, siblingCodes){
  let max = 0;
  siblingCodes.forEach(code => {
    const tail = String(code).slice(String(parentCode).length + 1);
    const n = parseInt(tail, 10);
    if(!isNaN(n) && n > max) max = n;
  });
  return parentCode + '.' + String(max + 1).padStart(2, '0');
}
function nodeHasAnyChildren(node){
  return nodeChildren(node).length > 0 || nodeGenericDetails(node).length > 0 || nodeItems(node).length > 0 || nodeCustomers(node).length > 0;
}

let expandedCoaNodes = new Set(['1', '1.01']);

function toggleCoaNode(id){
  if(expandedCoaNodes.has(id)) expandedCoaNodes.delete(id);
  else expandedCoaNodes.add(id);
  renderAccountTree();
}
function deleteCoaGenericDetail(id, event){
  if(event) event.stopPropagation();
  db.genericDetails = db.genericDetails.filter(d => d.id !== id);
  persist('genericDetails');
  renderAccountTree();
}
function deleteCoaNode(id, event){
  if(event) event.stopPropagation();
  const node = nodeById(id);
  if(!node || node.locked || isPermanentCustomerMoein(node)){
    toast('این سرفصل حسابداری و دسته‌بندی پیش‌فرض سیستم قفل بوده و غیرقابل حذف است', 'error');
    return;
  }
  if(nodeHasAnyChildren(node)){
    toast('این دسته‌بندی دارای زیرمجموعه، اشخاص یا کالا است و قابل حذف نیست', 'error');
    return;
  }
  showConfirmModal({
    title: `حذف دسته‌بندی / سرفصل: ${node.name}`,
    message: `آیا از حذف دسته‌بندی «${node.name}» با کدینگ (${node.code}) اطمینان دارید؟`,
    isDanger: true,
    confirmText: 'بله، حذف شود',
    cancelText: 'انصراف',
    onConfirm: () => {
      db.coaNodes = db.coaNodes.filter(n => n.id !== id);
      persist('coaNodes');
      if(customersActiveCategoryFilter === id) customersActiveCategoryFilter = null;
      addLog(`دسته‌بندی کدینگ «${node.name}» حذف شد`);
      toast(`دسته‌بندی «${node.name}» با موفقیت حذف شد`, 'success');
      renderAccountTree();
      renderCustomerBadges();
      renderCustomers();
    }
  });
}
function renameCoaNode(id, event){
  if(event) event.stopPropagation();
  const node = nodeById(id);
  if(!node || node.locked){
    toast('این سرفصل حسابداری قفل شده و قابل ویرایش نیست', 'error');
    return;
  }
  showPromptModal({
    title: 'ویرایش نام دسته‌بندی کدینگ',
    message: `نام جدید برای دسته‌بندی با کد (${node.code}) را وارد کنید:`,
    defaultValue: node.name,
    placeholder: 'نام دسته‌بندی...',
    confirmText: 'بروزرسانی نام',
    onConfirm: (trimmed) => {
      if(!trimmed){
        toast('نام دسته‌بندی نمی‌تواند خالی باشد', 'error');
        return;
      }
      node.name = trimmed;
      persist('coaNodes');
      addLog(`نام دسته‌بندی (${node.code}) به «${trimmed}» تغییر یافت`);
      toast(`نام دسته‌بندی به «${trimmed}» تغییر یافت`, 'success');
      renderAccountTree();
      renderCustomerBadges();
      renderCustomers();
    }
  });
}

function coaLevel(node){
  return String(node.code || '').split('.').length;
}

function getNodeAddPermission(node){
  if(!node){
    return {
      allowed: false,
      reason: 'جهت افزودن دسته‌بندی جدید، لطفاً یکی از گروه‌های اصلی مجاز (مانند «اشخاص»، «سایر اشخاص»، «پرسنل»، «کالا» یا «هزینه‌ها») را انتخاب کنید.'
    };
  }

  // 1. Root Groups (1 to 7) -> Group level is strictly locked
  if(node.parentId === null){
    return {
      allowed: false,
      reason: '🔒 این سرفصل «گروه اصلی حسابداری» است. طبق استاندارد حسابداری، ساختار گروه‌ها ثابت بوده و امکان تعریف حساب در سطح گروه وجود ندارد.'
    };
  }

  // 2. Kol Accounts (حساب‌های کل ترازنامه و سود و زیان)
  const lockedKolCodes = ['1.01', '1.02', '2.01', '2.02', '4.01', '5.01', '7.01'];
  if(lockedKolCodes.includes(node.code) || (node.code && node.code.startsWith('3.'))){
    return {
      allowed: false,
      reason: '🛡️ این سرفصل یک «حساب کل ترازنامه‌ای/مالی» است. سرفصل‌های معین آن از قبل برای محاسبه دقیق ترازنامه و صورت‌های مالی تعریف شده‌اند و افزودن سرفصل مستقیم زیر حساب کل مجاز نیست.'
    };
  }

  // 3. Parent nodes like 1.01.02 (حساب‌های دریافتنی) and 1.01.04 (موجودی کالا)
  if(node.code === '1.01.02'){
    return {
      allowed: false,
      reason: '🔒 زیر حساب‌های دریافتنی، ۳ گروه اصلی («اشخاص»، «سایر اشخاص»، «پرسنل») تعریف شده‌اند. جهت افزودن دسته، لطفاً وارد یکی از این ۳ گروه شوید.'
    };
  }
  if(node.code === '1.01.04'){
    return {
      allowed: false,
      reason: '🔒 جهت افزودن دسته کالا، لطفاً وارد گروه اصلی «کالا (انبار طلا و مصنوعات)» شوید.'
    };
  }

  // 4. Financial accounts (صندوق و بانک)
  if(node.attachType === 'financial' || node.code === '1.01.01' || (node.code && node.code.startsWith('1.01.01.'))){
    return {
      allowed: false,
      reason: '🏦 حساب‌های صندوق و بانک به‌صورت مستقیم از بخش «مدیریت مالی و بانک‌ها» ثبت و مدیریت می‌شوند و ساختار آن‌ها در کدینگ محافظت‌شده است.'
    };
  }

  // 5. Closed system accounts
  if(node.closed){
    return {
      allowed: false,
      reason: '⚙️ این حساب سیستمی خودکار است و مانده آن از فاکتورها، کاردکس یا اسناد تامین می‌شود، لذا افزودن زیرمجموعه در آن مجاز نیست.'
    };
  }

  // 6. Explicit 3 Customer Main Groups: Handled exclusively via dedicated Categories interface
  const isCustomerPrimaryGroup = ['1.01.02.01', '1.01.02.02', '1.01.02.03'].includes(node.code);
  const isItemPrimaryGroup = node.code === '1.01.04.01';
  const isOtherAllowedRoot = ['1.02.01', '2.01.01', '4.02', '6.01'].includes(node.code);

  if(isCustomerPrimaryGroup){
    return {
      allowed: false,
      reason: `🔒 گروه‌های اصلی اشخاص دارای سرفصل‌های معین محافظت‌شده هستند. ایجاد یا ویرایش دسته‌بندی‌ها مستقیماً از بخش اشخاص صورت می‌گیرد.`
    };
  }

  if(isItemPrimaryGroup){
    return {
      allowed: true,
      reason: `✅ گروه اصلی کالا آماده پذیرش دسته‌بندی جدید (مانند النگو، انگشتر، دستبند، سکه و...) است.`
    };
  }

  if(isOtherAllowedRoot){
    return {
      allowed: true,
      reason: `✅ سرفصل «${node.name}» آماده پذیرش دسته‌بندی جدید است.`
    };
  }

  // 7. If it's a category under customer groups -> RESTRICT: cannot add subcategories under category!
  if(node.attachType === 'customer' || (node.code && node.code.startsWith('1.01.02.'))){
    return {
      allowed: false,
      reason: '⚠️ این دسته در سطح نهایی قرار دارد. طبق استاندارد سیستم، امکان افزودن زیردسته تودرتو وجود ندارد و اشخاص مستقیماً به همین دسته متصل می‌شوند.'
    };
  }

  // 8. If it's a category under item group -> RESTRICT: cannot add subcategories under category!
  if(node.attachType === 'item' || (node.code && node.code.startsWith('1.01.04.'))){
    return {
      allowed: false,
      reason: '⚠️ این دسته کالا در سطح نهایی قرار دارد. طبق استاندارد سیستم، امکان افزودن زیردسته تودرتو وجود ندارد و کالاها مستقیماً به همین دسته متصل می‌شوند.'
    };
  }

  // 9. Other categories
  if(!node.allowAddChild){
    return {
      allowed: false,
      reason: '⚠️ این دسته در سطح نهایی قرار دارد و امکان تعریف زیردسته تودرتو در آن وجود ندارد.'
    };
  }

  return {
    allowed: false,
    reason: '🔒 امکان افزودن زیرشاخه به این سرفصل مجاز نیست.'
  };
}

function canAddUnderNode(node){
  return getNodeAddPermission(node).allowed;
}

function resolveNature(node){
  if(node.natureOverride) return node.natureOverride;
  if(node.nature) return node.nature;
  if(node.parentId){
    const parent = nodeById(node.parentId);
    if(parent) return resolveNature(parent);
  }
  return null;
}
function natureLabel(nature){
  if(nature === 'debit') return 'بدهکار';
  if(nature === 'credit') return 'بستانکار';
  if(nature === 'memo') return 'انتظامی';
  if(nature === 'both') return 'شناور';
  return '';
}
function coaIcons(node){
  const nat = natureLabel(resolveNature(node));
  let s = '';
  if(nat) s += `<span class="coa-nature" title="ماهیت حساب">${nat}</span>`;
  
  if(node.isBalanceSheetRoot || (node.code && (node.code.startsWith('1') || node.code.startsWith('2') || node.code.startsWith('3')))){
    s += `<span class="coa-nature" style="background:rgba(59,130,246,0.12); color:#60a5fa; border-color:rgba(59,130,246,0.25);" title="سرفصل ترازنامه‌ای">ترازنامه</span>`;
  } else if(node.code && (node.code.startsWith('4') || node.code.startsWith('5') || node.code.startsWith('6'))){
    s += `<span class="coa-nature" style="background:rgba(16,185,129,0.12); color:#34d399; border-color:rgba(16,185,129,0.25);" title="سرفصل سود و زیان">سود و زیان</span>`;
  }

  if(node.closed){
    s += `<span class="coa-nature" style="background:rgba(156,163,175,0.12); color:#9ca3af; border-color:rgba(156,163,175,0.25);" title="حساب سیستمی خودکار">سیستمی</span>`;
  } else if(!canAddUnderNode(node) && node.locked){
    s += `<span class="coa-lock" title="قفل شده جهت حفظ ساختار استاندارد ترازنامه">🔒 قفل ترازنامه</span>`;
  } else if(canAddUnderNode(node)){
    s += `<span class="coa-nature" style="background:rgba(217,119,6,0.12); color:var(--gold-bright); border-color:var(--gold-dim);" title="امکان تعریف دسته‌بندی و زیرشاخه">دسته‌بندی‌پذیر</span>`;
  }
  return s ? `<span class="coa-icons">${s}</span>` : '';
}

function renderNodeRow(node, depth){
  const isOpen = expandedCoaNodes.has(node.id);
  const children = nodeChildren(node);
  const details = nodeGenericDetails(node);
  const items = node.attachType === 'item' ? nodeItems(node) : [];
  const customers = node.attachType === 'customer' ? nodeCustomers(node) : [];
  const finAccounts = nodeFinancialAccounts(node);
  const childCount = children.length + details.length + items.length + customers.length + finAccounts.length;
  const arrow = childCount || node.attachType ? (isOpen ? '▾' : '▸') : '·';
  const isAddAllowed = canAddUnderNode(node);

  let inner = '';
  if(isOpen){
    children.forEach(child => { inner += renderNodeRow(child, depth + 1); });
    details.forEach(d => {
      inner += `<div class="coa-leaf-row" style="padding-right:${(depth+1)*18}px;">
        <span class="coa-code" style="min-width:65px;">${node.code}.${d.code || d.id.slice(0,4)}</span>
        <span class="coa-leaf-name">🏷️ ${d.name}</span>
        <button class="btn btn-sm" onclick="deleteCoaGenericDetail('${d.id}', event)">حذف</button>
      </div>`;
    });
    items.forEach(i => {
      inner += `<div class="coa-leaf-row" style="padding-right:${(depth+1)*18}px;">
        <span class="coa-code" style="min-width:65px;">${node.code}.${i.code || '2001'}</span>
        <span class="coa-leaf-name">💍 <span class="item-code-badge" style="margin-left:4px;">${toFa(i.code)}</span> ${i.name}${i.barcode ? ` <span class="stat-sub">(${i.barcode})</span>` : ''}</span>
      </div>`;
    });
    customers.forEach(c => {
      inner += `<div class="coa-leaf-row" style="padding-right:${(depth+1)*18}px;">
        <span class="coa-code" style="min-width:65px;">${node.code}.${c.code || '1001'}</span>
        <span class="coa-leaf-name">👤 <span class="cust-code-badge" style="margin-left:4px;">${toFa(c.code)}</span> ${c.name}</span>
      </div>`;
    });
    finAccounts.forEach(a => {
      inner += `<div class="coa-leaf-row" style="padding-right:${(depth+1)*18}px;">
        <span class="coa-code" style="min-width:65px;">${node.code}.${a.code || '101'}</span>
        <span class="coa-leaf-name">💳 <span class="acc-code-badge" style="margin-left:4px;">${toFa(a.code)}</span> ${a.name}</span>
        <span class="stat-sub">${toFa(getAccountBalance(a.id))} ریال</span>
      </div>`;
    });
    if(!childCount){
      inner += `<div class="suggest-empty" style="padding-right:${(depth+1)*18}px;">${node.attachType === 'financial' ? 'حسابی در بخش «مالی» ثبت نشده' : 'زیرمجموعه‌ای ثبت نشده'}</div>`;
    }
  }

  return `
    <div class="coa-node-row ${depth===0 ? 'coa-node-row-top' : ''}" style="padding-right:${depth*18}px;" onclick="toggleCoaNode('${node.id}')">
      <span class="coa-arrow">${arrow}</span>
      <span class="coa-code">${node.code}</span>
      <span class="coa-name">${node.name}${node.unit === 'gram' ? ' <span class="stat-sub">(گرم)</span>' : ''}</span>
      ${coaIcons(node)}
      ${isAddAllowed ? `<button class="btn btn-sm" style="font-size:11px; padding:3px 8px; color:var(--gold-bright); border-color:var(--gold-dim); background:rgba(217,119,6,0.08);" onclick="openCoaBrowserAtNode('${node.id}', event)" title="افزودن دسته‌بندی به این سرفصل">+ دسته‌بندی</button>` : ''}
      ${!node.locked ? `<button class="btn btn-sm" onclick="renameCoaNode('${node.id}', event)">ویرایش</button>
        ${!isPermanentCustomerMoein(node) ? `<button class="btn btn-sm" onclick="deleteCoaNode('${node.id}', event)">حذف</button>` : ''}` : ''}
    </div>
    ${isOpen ? `<div class="coa-children">${inner}</div>` : ''}
  `;
}

function renderAccountTree(){
  const container = document.getElementById('account-tree');
  if(!container) return;
  const roots = db.coaNodes.filter(n => n.parentId === null);
  container.innerHTML = roots.map(r => renderNodeRow(r, 0)).join('');
}

let coaBrowserPath = [];
function openCoaBrowser(){
  coaBrowserPath = [];
  const overlay = document.getElementById('coa-browser-overlay');
  if(overlay) overlay.style.display = 'flex';
  renderCoaBrowser();
}
function openCoaBrowserAtNode(nodeId, event){
  if(event) event.stopPropagation();
  const node = nodeById(nodeId);
  if(!node) return;
  const path = [];
  let curr = node;
  while(curr){
    path.unshift(curr);
    curr = curr.parentId ? nodeById(curr.parentId) : null;
  }
  coaBrowserPath = path;
  const overlay = document.getElementById('coa-browser-overlay');
  if(overlay) overlay.style.display = 'flex';
  renderCoaBrowser();
}
function closeCoaBrowser(){
  const overlay = document.getElementById('coa-browser-overlay');
  if(overlay) overlay.style.display = 'none';
  coaBrowserPath = [];
}
function coaBrowserCurrentNode(){
  return coaBrowserPath.length ? coaBrowserPath[coaBrowserPath.length - 1] : null;
}
function coaBrowserNavigateInto(nodeId){
  const node = nodeById(nodeId);
  if(!node) return;
  coaBrowserPath.push(node);
  renderCoaBrowser();
}
function coaBrowserGoBack(){
  coaBrowserPath.pop();
  renderCoaBrowser();
}
function renderCoaBrowser(){
  const current = coaBrowserCurrentNode();
  const backBtn = document.getElementById('coa-browser-back');
  if(backBtn) backBtn.style.display = coaBrowserPath.length ? 'inline-block' : 'none';
  const breadcrumb = document.getElementById('coa-browser-breadcrumb');
  if(breadcrumb) breadcrumb.textContent = coaBrowserPath.length ? coaBrowserPath.map(n => n.name).join(' › ') : 'گروه‌های اصلی حسابداری';

  const list = document.getElementById('coa-browser-list');
  const formBox = document.getElementById('coa-browser-form');
  const children = current ? nodeChildren(current) : db.coaNodes.filter(n => n.parentId === null);

  if(!children.length){
    list.innerHTML = `<div class="suggest-empty" style="padding:16px; text-align:center;">زیرشاخه‌ای وجود ندارد</div>`;
  } else {
    list.innerHTML = children.map(n => {
      const isAllowed = canAddUnderNode(n);
      return `
        <div class="modal-item" onclick="coaBrowserNavigateInto('${n.id}')" style="cursor:pointer; display:flex; align-items:center; gap:8px; padding:9px 10px; border-radius:8px; border-bottom:1px solid var(--border);">
          <span style="font-weight:700; color:var(--text-dim); font-size:11.5px; min-width:64px;">${n.code}</span>
          <span style="flex:1; font-size:12.5px;">${n.name}</span>
          ${isAllowed ? '<span class="badge" style="background:rgba(217,119,6,0.15); color:var(--gold-bright); font-size:10px; padding:2px 6px;">دسته‌بندی‌پذیر</span>' : (n.locked ? '<span class="coa-lock" style="font-size:11px;" title="حفاظت‌شده">🔒</span>' : '')}
          <span style="color:var(--text-faint);">›</span>
        </div>
      `;
    }).join('');
  }

  const perm = getNodeAddPermission(current);
  if(formBox){
    if(perm.allowed){
      formBox.style.display = 'block';
      formBox.innerHTML = `
        <div style="font-size:12px; font-weight:700; color:var(--gold-bright); margin-bottom:8px;">
          ✨ افزودن دسته‌بندی جدید زیر سرفصل: «${current.name}» (${current.code})
        </div>
        <div style="display:flex; gap:8px;">
          <input id="coa-browser-new-name" placeholder="نام دسته‌بندی جدید (مثلاً: طلای دست‌دوم، بنکداران، تبلیغات و...)" style="flex:1;" onkeydown="if(event.key==='Enter') coaBrowserSaveCategory()">
          <button class="btn btn-gold btn-sm" onclick="coaBrowserSaveCategory()">+ افزودن</button>
        </div>
      `;
      const nameEl = document.getElementById('coa-browser-new-name');
      if(nameEl) nameEl.value = '';
    } else {
      formBox.style.display = 'block';
      formBox.innerHTML = `
        <div style="background:rgba(239, 68, 68, 0.08); padding:10px 14px; border-radius:8px; border:1px solid rgba(239, 68, 68, 0.25); font-size:12px; line-height:1.6;">
          <div style="font-weight:700; color:var(--danger); display:flex; align-items:center; gap:6px; margin-bottom:4px;">
            <span>🛡️ وضعیت دسترسی این سرفصل</span>
          </div>
          <div style="color:var(--text-dim);">${perm.reason}</div>
        </div>
      `;
    }
  }
}

function coaBrowserSaveCategory(){
  const current = coaBrowserCurrentNode();
  if(!current) return;
  const perm = getNodeAddPermission(current);
  if(!perm.allowed){
    toast(perm.reason || 'امکان افزودن زیرمجموعه به این سرفصل وجود ندارد');
    return;
  }
  const nameEl = document.getElementById('coa-browser-new-name') as HTMLInputElement | null;
  const name = nameEl ? nameEl.value.trim() : '';
  if(!name){ toast('نام دسته‌بندی را وارد کنید'); return; }
  setNodeChildMode(current, 'category');
  const siblings = nodeChildren(current);
  const code = nextChildCode(current.code, siblings.map(s => s.code));
  db.coaNodes.push({
    id: uuid(),
    parentId: current.id,
    code,
    name,
    locked: false,
    allowAddChild: false, // Single-level category: no nested subcategories allowed under it
    isBalanceSheetRoot: false,
    childMode: null,
    attachType: current.attachType,
    closed: false,
    natureOverride: current.natureOverride || null,
    financialType: null,
    unit: null
  });
  persist('coaNodes');
  toast('دسته‌بندی جدید با موفقیت اضافه شد');
  expandedCoaNodes.add(current.id);
  renderAccountTree();
  renderCoaBrowser();
  populateCustomerCategorySelect(customersActiveBranch);
  populateItemCategorySelect();
}

/* ============ base info: opening balances + books coding ============ */
let activeBaseInfoTab = 'opening';

function switchBaseInfoTab(tab){
  activeBaseInfoTab = tab || 'opening';
  document.querySelectorAll('.side-tab-item[data-basetab], .tab-btn[data-basetab]').forEach(b => b.classList.toggle('active', b.dataset.basetab === tab));
  document.querySelectorAll('#view-baseinfo .finance-subview').forEach(v => v.classList.toggle('active', v.id === 'basetab-' + tab));
  if(tab === 'opening'){
    const fstart = document.getElementById('fiscal-year-start');
    if(fstart) fstart.value = db.settings.fiscalYearStart || '';
    renderOpeningCustomers();
    renderOpeningAccounts();
  }
  if(tab === 'coding'){
    renderAccountTree();
  }
}
function renderBaseInfo(){ switchBaseInfoTab('opening'); }
function saveFiscalYearStart(){
  const fstart = document.getElementById('fiscal-year-start');
  db.settings.fiscalYearStart = fstart ? fstart.value || null : null;
  persist('settings');
  toast('تاریخ شروع دوره مالی ذخیره شد');
}

function renderOpeningCustomers(){
  const tbody = document.getElementById('opening-customers-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  const emptyEl = document.getElementById('opening-customers-empty');
  if(emptyEl) emptyEl.style.display = db.customers.length ? 'none' : 'block';
  db.customers.forEach(c => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="cust-code-badge">${toFa(c.code || '1001')}</span></td>
      <td><b>${c.name}</b></td>
      <td><input id="open-cust-toman-${c.id}" type="text" inputmode="numeric" value="${fmtMoneyInput(c.tomanBalance)}" style="max-width:180px;" oninput="formatCurrencyInput(this)" onchange="saveOpeningCustomerBalance('${c.id}')"></td>
      <td><input id="open-cust-gold-${c.id}" type="number" step="0.001" value="${c.goldBalance18 || ''}" style="max-width:150px;" onchange="saveOpeningCustomerBalance('${c.id}')"></td>`;
    tbody.appendChild(tr);
  });
}
function saveOpeningCustomerBalance(customerId){
  const c = db.customers.find(x => x.id === customerId);
  if(!c) return;
  c.tomanBalance = currencyValue(document.getElementById('open-cust-toman-' + customerId));
  c.goldBalance18 = Number(toEn(document.getElementById('open-cust-gold-' + customerId)?.value || 0));
  c.updated_at = nowISO();
  c.is_synced = false;
  persist('customers');
  toast('مانده افتتاحیه شخص ذخیره شد');
}
function renderOpeningAccounts(){
  const tbody = document.getElementById('opening-accounts-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  const emptyEl = document.getElementById('opening-accounts-empty');
  if(emptyEl) emptyEl.style.display = db.financialAccounts.length ? 'none' : 'block';
  db.financialAccounts.forEach(a => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="acc-code-badge">${toFa(a.code || '101')}</span></td>
      <td><b>${a.name}</b></td>
      <td>${a.type === 'bank' ? 'بانک' : 'صندوق'}</td>
      <td><input id="open-acc-${a.id}" type="text" inputmode="numeric" value="${fmtMoneyInput(a.initialBalance)}" style="max-width:200px;" oninput="formatCurrencyInput(this)" onchange="saveOpeningAccountBalance('${a.id}')"></td>`;
    tbody.appendChild(tr);
  });
}
function saveOpeningAccountBalance(accountId){
  const a = db.financialAccounts.find(x => x.id === accountId);
  if(!a) return;
  a.initialBalance = currencyValue(document.getElementById('open-acc-' + accountId));
  a.updated_at = nowISO();
  a.is_synced = false;
  persist('financialAccounts');
  toast('مانده افتتاحیه حساب ذخیره شد');
}

/* ============ navigation ============ */
function go(view){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const targetView = document.getElementById('view-' + view);
  if(targetView) targetView.classList.add('active');
  const targetNav = document.querySelector('.nav-item[data-view="' + view + '"]');
  if(targetNav) targetNav.classList.add('active');

  if(view === 'dashboard') renderDashboard();
  if(view === 'invoice') renderInvoiceView();
  if(view === 'vouchers') renderVouchersView();
  if(view === 'customers') renderCustomers();
  if(view === 'inventory') renderInventory();
  if(view === 'reports') renderReports();
  if(view === 'finance') renderFinance();
  if(view === 'expenses') renderExpenses();
  if(view === 'baseinfo') renderBaseInfo();
  if(view === 'settings') renderSettings();
  if(view === 'sync') renderSync();

  setTimeout(() => initAllTableResizers(), 60);
}

function newInvoice(mode?: string){
  editingInvoiceId = null;
  activeInvoiceMode = mode || 'sell';
  go('invoice');
  if(typeof switchInvoiceMode === 'function'){
    switchInvoiceMode(activeInvoiceMode);
  }
}
function editInvoice(id){
  editingInvoiceId = id;
  go('invoice');
}

/* ============ ticker ============ */
function renderTicker(){
  const t = db.settings.price18UpdatedAt ? new Date(db.settings.price18UpdatedAt).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}) : 'امروز';
  const ticker = document.getElementById('ticker');
  if(ticker){
    ticker.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10b981; box-shadow:0 0 6px #10b981;"></span>
        <span style="color:var(--text-dim); font-size:11.5px;">نرخ مبنای طلای ۱۸ عیار:</span>
        <span style="font-weight:800; color:var(--gold-bright); font-size:13px; font-variant-numeric:tabular-nums; direction:ltr; display:inline-block;">${toFa(fmtMoney(db.settings.price18))}</span>
        <span style="color:var(--text-faint); font-size:11px;">ریال / گرم</span>
      </div>
      <span style="color:var(--border); margin:0 8px;">|</span>
      <div style="font-size:11px; color:var(--text-faint); display:flex; align-items:center; gap:6px;">
        <span>سود مصوب: <b style="color:var(--text);">${toFa(db.settings.profit || 7)}٪</b></span>
        <span>•</span>
        <span>به‌روزرسانی: <span style="direction:ltr; display:inline-block; font-variant-numeric:tabular-nums;">${t}</span></span>
      </div>
    `;
  }
}

/* ============ dashboard ============ */
function countPendingSync(){
  return [...db.customers, ...db.inventory, ...db.invoices, ...db.financialAccounts, ...db.checks, ...db.financialTransactions, ...(db.expensesIncomes || [])]
    .filter(r => !r.is_synced).length;
}

function renderDashboard(){
  document.getElementById('stat-customers').textContent = toFa(db.customers.length);
  document.getElementById('stat-inventory').textContent = toFa(db.inventory.length);
  document.getElementById('stat-inventory-count').textContent = 'در کاتالوگ انبار';

  const today = new Date().toDateString();
  const todays = db.invoices.filter(inv => new Date(inv.date).toDateString() === today && inv.type === 'sell');
  const todaysTotal = todays.reduce((s, inv) => s + (inv.total || 0), 0);
  document.getElementById('stat-today').textContent = toFa(todaysTotal) + ' ریال';
  document.getElementById('stat-today-count').textContent = toFa(todays.length) + ' فاکتور فروش امروز';

  document.getElementById('stat-pending').textContent = toFa(countPendingSync());
  document.getElementById('dash-gold-price').textContent = toFa(db.settings.price18) + ' ریال';
  const dpt = db.settings.price18UpdatedAt ? new Date(db.settings.price18UpdatedAt).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'}) : '—';
  document.getElementById('dash-gold-price-time').textContent = 'آخرین به‌روزرسانی: ساعت ' + dpt;

  const tbody = document.querySelector('#recent-invoices-table tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const recent = [...db.invoices].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);
  document.getElementById('recent-empty').style.display = recent.length ? 'none' : 'block';
  recent.forEach(inv => {
    const cust = db.customers.find(c => c.id === inv.customerId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>#${inv.number}</td>
      <td>${cust ? cust.name : '—'}</td>
      <td><span class="badge ${inv.type==='sell'?'badge-synced':'badge-pending'}">${inv.type==='sell'?'فروش':'خرید'}</span></td>
      <td>${toFa(inv.total)} ریال</td>
      <td>${new Date(inv.date).toLocaleDateString('fa-IR')}</td>
      <td>${syncBadge(inv.is_synced)}</td>
      <td><button class="btn btn-sm" onclick="editInvoice('${inv.id}')">ویرایش</button></td>`;
    tbody.appendChild(tr);
  });
}

function syncBadge(isSynced){
  return isSynced
    ? `<span class="badge badge-synced"><span class="dot"></span>همگام‌شده</span>`
    : `<span class="badge badge-pending"><span class="dot"></span>در انتظار</span>`;
}

/* ============ customers ============ */
let editingCustomerId = null;
let customersSort = { field: null, dir: 0 };
let customersActiveBranch = 'main';
let customersActiveCategoryFilter: string | null = null;
let custPickerTargetBranch = 'main';

function coaNodeByCode(code){ return db.coaNodes.find(n => n.code === code); }
function customerBranchRootNode(branch){
  if(branch === 'staff') return coaNodeByCode('1.01.02.03');
  if(branch === 'other') return coaNodeByCode('1.01.02.02');
  return coaNodeByCode('1.01.02.01');
}

function getCustomerCategoryPath(nodeId, branch){
  const root = customerBranchRootNode(branch || 'main');
  if(!nodeId || (root && nodeId === root.id)){
    return root ? root.name : 'اشخاص';
  }
  const node = nodeById(nodeId);
  if(!node) return root ? root.name : 'اشخاص';
  if(node.parentId){
    const parent = nodeById(node.parentId);
    if(parent && (parent.code?.startsWith('1.01.02.') || parent.code === '1.01.02')){
      return `${parent.name} › ${node.name}`;
    }
  }
  return `${root ? root.name + ' › ' : ''}${node.name}`;
}

function customerTreePositionLabel(c){
  return getCustomerCategoryPath(c.parentNodeId, c.branch);
}

function populateCustomerGroupFilterSelect(){
  const selectEl = document.getElementById('customers-filter-group') as HTMLSelectElement | null;
  if(!selectEl) return;
  const root = customerBranchRootNode(customersActiveBranch);
  const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
  const totalCount = (db.customers || []).filter(c => (c.branch || 'main') === customersActiveBranch).length;
  const unassignedCount = (db.customers || []).filter(c => (c.branch || 'main') === customersActiveBranch && (!c.parentNodeId || c.parentNodeId === root?.id)).length;

  let optionsHtml = `<option value="all">همه گروه‌ها (${toFa(totalCount)})</option>`;
  categories.forEach(cat => {
    const count = (db.customers || []).filter(c => c.parentNodeId === cat.id).length;
    optionsHtml += `<option value="${cat.id}">${escapeHtml(cat.name)} (${toFa(count)})</option>`;
  });
  if(unassignedCount > 0){
    optionsHtml += `<option value="__unassigned__">بدون گروه / پیش‌فرض (${toFa(unassignedCount)})</option>`;
  }
  selectEl.innerHTML = optionsHtml;
  selectEl.value = customersActiveCategoryFilter || 'all';
}

function onCustomerGroupFilterChange(val: string){
  const catId = (val === 'all' || !val) ? null : val;
  filterCustomersByCategory(catId);
}

function updateCustomerKpis(){
  const list = db.customers || [];
  const totalCount = list.length;
  let totalGold = 0;
  let totalToman = 0;
  let debtorCount = 0;
  let creditorCount = 0;

  list.forEach(c => {
    const g = c.goldBalance18 || 0;
    const t = c.tomanBalance || 0;
    totalGold += g;
    totalToman += t;
    if(g > 0.0001 || t > 0) debtorCount++;
    else if(g < -0.0001 || t < 0) creditorCount++;
  });

  const countEl = document.getElementById('kpi-cust-count');
  if(countEl) countEl.textContent = toFa(totalCount);

  const goldEl = document.getElementById('kpi-cust-gold');
  if(goldEl){
    const gFmt = formatGoldWithUnit(totalGold);
    const sign = totalGold < -0.0001 ? ' (بستانکار)' : totalGold > 0.0001 ? ' (بدهکار)' : '';
    const color = totalGold < -0.0001 ? 'var(--danger)' : totalGold > 0.0001 ? 'var(--gold-bright)' : 'var(--text-faint)';
    goldEl.innerHTML = `${gFmt.value} <span class="cust-kpi-unit">${gFmt.unit}</span><span style="font-size:10px; font-weight:normal; margin-right:4px; color:${color};">${sign}</span>`;
  }

  const tomanEl = document.getElementById('kpi-cust-toman');
  if(tomanEl){
    const sign = totalToman < 0 ? ' (بستانکار)' : totalToman > 0 ? ' (بدهکار)' : '';
    const color = totalToman < 0 ? 'var(--danger)' : totalToman > 0 ? '#38bdf8' : 'var(--text-faint)';
    tomanEl.innerHTML = `${toFa(fmtMoney(Math.abs(totalToman)))} <span class="cust-kpi-unit">ریال</span><span style="font-size:10px; font-weight:normal; margin-right:4px; color:${color};">${sign}</span>`;
  }

  const statusEl = document.getElementById('kpi-cust-status');
  if(statusEl){
    statusEl.innerHTML = `<span style="color:var(--gold-bright); font-size:11.5px;">${toFa(debtorCount)} بدهکار</span> <span style="color:var(--text-faint); margin:0 3px;">/</span> <span style="color:var(--danger); font-size:11.5px;">${toFa(creditorCount)} بستانکار</span>`;
  }
}

function renderCustomerBadges(){
  populateCustomerGroupFilterSelect();
  updateCustomerKpis();
  const mainEl = document.getElementById('sidetab-badge-cust-main');
  const otherEl = document.getElementById('sidetab-badge-cust-other');
  const staffEl = document.getElementById('sidetab-badge-cust-staff');
  if(mainEl) mainEl.textContent = toFa((db.customers || []).filter(c => (!c.branch || c.branch === 'main')).length);
  if(otherEl) otherEl.textContent = toFa((db.customers || []).filter(c => c.branch === 'other').length);
  if(staffEl) staffEl.textContent = toFa((db.customers || []).filter(c => c.branch === 'staff').length);

  const sidebarCatEl = document.getElementById('customer-sidebar-categories');
  const sidebarTitleEl = document.getElementById('cust-sidebar-title');
  if(sidebarTitleEl){
    if(customersActiveBranch === 'staff') sidebarTitleEl.textContent = 'گروه‌های پرسنل';
    else if(customersActiveBranch === 'other') sidebarTitleEl.textContent = 'گروه‌های سایر اشخاص';
    else sidebarTitleEl.textContent = 'گروه‌های اشخاص';
  }

  if(sidebarCatEl){
    const root = customerBranchRootNode(customersActiveBranch);
    const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
    const totalCount = (db.customers || []).filter(c => (c.branch || 'main') === customersActiveBranch).length;
    const unassignedCount = (db.customers || []).filter(c => (c.branch || 'main') === customersActiveBranch && (!c.parentNodeId || c.parentNodeId === root?.id)).length;

    if(categories.length === 0){
      sidebarCatEl.innerHTML = `
        <button class="cust-cat-item-btn active" onclick="filterCustomersByCategory(null)">
          <span>همه ${root ? root.name : 'اشخاص'}</span>
          <span class="cust-cat-count">${toFa(totalCount)}</span>
        </button>
        <div style="padding:16px 8px; font-size:11px; color:var(--text-faint); text-align:center; line-height:1.6;">
          هنوز گروهی تعریف نشده است.<br>از دکمه «+ گروه جدید» برای ایجاد دسته‌بندی استفاده کنید.
        </div>
      `;
    } else {
      let html = `
        <button class="cust-cat-item-btn ${!customersActiveCategoryFilter ? 'active' : ''}" onclick="filterCustomersByCategory(null)">
          <span>همه موارد ${root ? root.name : ''}</span>
          <span class="cust-cat-count">${toFa(totalCount)}</span>
        </button>
      `;
      categories.forEach(cat => {
        const count = (db.customers || []).filter(c => c.parentNodeId === cat.id).length;
        const isAct = customersActiveCategoryFilter === cat.id;
        html += `
          <button class="cust-cat-item-btn ${isAct ? 'active' : ''}" onclick="filterCustomersByCategory('${cat.id}')">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${cat.name}">${cat.name}</span>
            <span class="cust-cat-count">${toFa(count)}</span>
          </button>
        `;
      });
      if(unassignedCount > 0){
        const isUnassigned = customersActiveCategoryFilter === '__unassigned__';
        html += `
          <button class="cust-cat-item-btn ${isUnassigned ? 'active' : ''}" style="color:#fbbf24;" onclick="filterCustomersByCategory('__unassigned__')">
            <span>بدون دسته (پیش‌فرض)</span>
            <span class="cust-cat-count" style="background:rgba(251,191,36,0.15); color:#fbbf24;">${toFa(unassignedCount)}</span>
          </button>
        `;
      }
      sidebarCatEl.innerHTML = html;
    }
  }
}

function filterCustomersByCategory(catId: string | null){
  customersActiveCategoryFilter = catId;
  const selectEl = document.getElementById('customers-filter-group') as HTMLSelectElement | null;
  if(selectEl) selectEl.value = catId || 'all';
  renderCustomerBadges();
  renderCustomers();
}

function switchCustomersBranch(branch){
  customersActiveBranch = branch;
  customersActiveCategoryFilter = null;
  (window as any).customersActiveBranch = branch;
  document.querySelectorAll('.side-tab-item[data-custbranch], .tab-btn[data-custbranch]').forEach(b => b.classList.toggle('active', b.dataset.custbranch === branch));
  closeCustomerForm();
  closeCustCategoryPicker();

  const titleEl = document.querySelector('#view-customers .cust-modern-title');
  const subEl = document.querySelector('#view-customers .cust-modern-subtitle');
  const sidebarTitleEl = document.getElementById('cust-sidebar-title');
  if(titleEl){
    if(branch === 'staff'){
      titleEl.textContent = 'پرسنل و همکاران فروشگاه';
      if(subEl) subEl.textContent = 'حساب‌های پرسنل، حقوق، مساعده و کارکرد کارکنان';
      if(sidebarTitleEl) sidebarTitleEl.textContent = 'گروه‌های پرسنل';
    } else if(branch === 'other'){
      titleEl.textContent = 'سایر اشخاص و طرف‌حساب‌ها';
      if(subEl) subEl.textContent = 'شرکا، بستانکاران متفرقه، خدمات و اشخاص غیرتجاری';
      if(sidebarTitleEl) sidebarTitleEl.textContent = 'گروه‌های سایر اشخاص';
    } else {
      titleEl.textContent = 'اشخاص اصلی (مشتریان و همکاران)';
      if(subEl) subEl.textContent = 'دفاتر مالی مستقل ریالی و وزنی (۱۸ عیار) برای طرف‌حساب‌های طلا';
      if(sidebarTitleEl) sidebarTitleEl.textContent = 'گروه‌های اشخاص';
    }
  }

  renderCustomerBadges();
  renderCustomers();
}

let tempCustomerFormData: any = null;

function populateCustomerCategorySelect(branch: string, selectedCatId?: string | null){
  const selectEl = document.getElementById('cust-category-select') as HTMLSelectElement | null;
  const parentInput = document.getElementById('cust-parent-node-id') as HTMLInputElement | null;
  const branchInput = document.getElementById('cust-branch') as HTMLInputElement | null;
  if(branchInput) branchInput.value = branch || 'main';

  const root = customerBranchRootNode(branch || 'main');
  const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
  
  let effectiveVal = selectedCatId;
  if(!effectiveVal || (!categories.some(c => c.id === effectiveVal) && (!root || root.id !== effectiveVal))){
    effectiveVal = categories.length > 0 ? categories[0].id : (root ? root.id : '');
  }

  if(selectEl){
    selectEl.innerHTML = '';
    if(categories.length === 0){
      if(root){
        const opt = document.createElement('option');
        opt.value = root.id;
        opt.textContent = `📁 ${root.name} (پیش‌فرض)`;
        selectEl.appendChild(opt);
      }
    } else {
      categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = `📂 ${cat.name} (${cat.code})`;
        selectEl.appendChild(opt);
      });
    }
    selectEl.value = effectiveVal;
  }

  if(parentInput && effectiveVal) parentInput.value = effectiveVal;
}

function onCustomerCategorySelectChange(catId: string){
  const parentInput = document.getElementById('cust-parent-node-id') as HTMLInputElement | null;
  if(parentInput) parentInput.value = catId;
  updateCustomerFormPath();
}

function onCustBranchChange(branch){
  const root = customerBranchRootNode(branch);
  const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
  const defaultCatId = categories.length > 0 ? categories[0].id : (root ? root.id : null);
  
  populateCustomerCategorySelect(branch, defaultCatId);
  updateCustomerFormPath();
}

function updateCustomerFormPath(){
  const branchEl = document.getElementById('cust-branch') as HTMLInputElement | null;
  const parentInput = document.getElementById('cust-parent-node-id') as HTMLInputElement | null;
  const branch = branchEl ? branchEl.value : (customersActiveBranch || 'main');
  const catId = parentInput ? parentInput.value : null;
  const pathText = getCustomerCategoryPath(catId, branch);
  const pathEl = document.getElementById('cust-form-path-text');
  if(pathEl) pathEl.textContent = pathText;
}

function promptQuickCreateCategory(branch?: string){
  const targetBranch = branch || (document.getElementById('cust-branch') as HTMLInputElement)?.value || customersActiveBranch || 'main';
  const root = customerBranchRootNode(targetBranch);
  if(!root) return;
  showPromptModal({
    title: 'تعریف دسته‌بندی جدید اشخاص',
    message: `نام دسته / معین جدید زیر گروه «${root.name}» (مثلاً: بنکداران، همکاران، مشتریان ویژه):`,
    placeholder: 'نام دسته‌بندی جدید...',
    confirmText: 'ایجاد دسته‌بندی',
    onConfirm: (trimmed) => {
      if(!trimmed){
        toast('نام دسته نمی‌تواند خالی باشد', 'error');
        return;
      }
      const siblings = nodeChildren(root);
      const code = nextChildCode(root.code, siblings.map(s => s.code));
      const newCat = {
        id: uuid(),
        parentId: root.id,
        code,
        name: trimmed,
        locked: false,
        allowAddChild: false,
        isBalanceSheetRoot: false,
        childMode: null,
        attachType: 'customer',
        closed: false,
        natureOverride: root.natureOverride || null,
        financialType: null,
        unit: null
      };
      db.coaNodes.push(newCat);
      persist('coaNodes');
      toast(`دسته‌بندی «${trimmed}» با موفقیت ایجاد شد`, 'success');
      expandedCoaNodes.add(root.id);
      renderAccountTree();
      renderCustomerBadges();

      populateCustomerCategorySelect(targetBranch, newCat.id);
      updateCustomerFormPath();
    }
  });
}

function promptRenameCustomerCategory(catId: string, event?: Event){
  if(event) event.stopPropagation();
  const node = nodeById(catId);
  if(!node) return;
  showPromptModal({
    title: 'ویرایش نام دسته‌بندی اشخاص',
    message: `نام جدید برای دسته‌بندی «${node.name}» را وارد نمایید:`,
    defaultValue: node.name,
    placeholder: 'نام دسته‌بندی (مثلاً: بنکداران، همکاران، مشتریان ویژه)...',
    confirmText: 'بروزرسانی نام',
    onConfirm: (trimmed) => {
      if(!trimmed){
        toast('نام دسته نمی‌تواند خالی باشد', 'error');
        return;
      }
      node.name = trimmed;
      persist('coaNodes');
      addLog(`نام دسته اشخاص به «${trimmed}» تغییر یافت`);
      toast(`نام دسته به «${trimmed}» تغییر یافت`, 'success');
      renderAccountTree();
      renderCustomerBadges();
      renderCustomers();
      
      const branchEl = document.getElementById('cust-branch') as HTMLInputElement | null;
      const parentInput = document.getElementById('cust-parent-node-id') as HTMLInputElement | null;
      if(branchEl){
        populateCustomerCategorySelect(branchEl.value, parentInput?.value);
        updateCustomerFormPath();
      }

      const pickerModal = document.getElementById('customer-cat-picker-modal');
      if(pickerModal && pickerModal.style.display === 'flex'){
        openCustCategoryPicker(custPickerTargetBranch, custPickerMode);
      }
    }
  });
}

function promptDeleteCustomerCategory(catId: string, event?: Event){
  if(event) event.stopPropagation();
  const node = nodeById(catId);
  if(!node) return;
  if(isPermanentCustomerMoein(node)){
    toast('این دسته‌بندی معین، سرفصل پیش‌فرض و اصلی سیستم است و غیرقابل حذف می‌باشد', 'error');
    return;
  }
  const count = (db.customers || []).filter(c => c.parentNodeId === node.id).length;
  if(count > 0){
    toast(`این دسته دارای ${toFa(count)} شخص است. ابتدا اشخاص آن را ویرایش یا منتقل کنید.`, 'error');
    return;
  }
  const root = node.parentId ? nodeById(node.parentId) : null;
  const siblings = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
  if(siblings.length <= 1){
    toast('وجود حداقل یک دسته / معین در این گروه الزامی است. می‌توانید نام آن را ویرایش کنید.', 'error');
    return;
  }
  showConfirmModal({
    title: `حذف دسته‌بندی «${node.name}»`,
    message: `آیا از حذف دسته‌بندی «${node.name}» از گروه ${root ? root.name : 'اشخاص'} اطمینان دارید؟`,
    isDanger: true,
    confirmText: 'بله، حذف شود',
    cancelText: 'انصراف',
    onConfirm: () => {
      db.coaNodes = db.coaNodes.filter(n => n.id !== node.id);
      persist('coaNodes');
      if(customersActiveCategoryFilter === node.id){
        customersActiveCategoryFilter = null;
      }
      addLog(`دسته‌بندی «${node.name}» حذف شد`);
      toast(`دسته «${node.name}» با موفقیت حذف شد`, 'success');
      renderAccountTree();
      renderCustomerBadges();
      renderCustomers();
    }
  });
}

function captureCurrentCustomerFormValues(){
  return {
    editingCustomerId,
    code: (document.getElementById('cust-code') as HTMLInputElement)?.value || '',
    branch: (document.getElementById('cust-branch') as HTMLSelectElement)?.value || 'main',
    personType: (document.getElementById('cust-person-type') as HTMLSelectElement)?.value || 'real',
    name: (document.getElementById('cust-name') as HTMLInputElement)?.value || '',
    job: (document.getElementById('cust-job') as HTMLInputElement)?.value || '',
    nationalId: (document.getElementById('cust-national-id') as HTMLInputElement)?.value || '',
    economicCode: (document.getElementById('cust-economic-code') as HTMLInputElement)?.value || '',
    introducer: (document.getElementById('cust-introducer') as HTMLInputElement)?.value || '',
    birthDate: (document.getElementById('cust-birth-date') as HTMLInputElement)?.value || '',
    phone: (document.getElementById('cust-phone') as HTMLInputElement)?.value || '',
    phone2: (document.getElementById('cust-phone2') as HTMLInputElement)?.value || '',
    postalCode: (document.getElementById('cust-postal-code') as HTMLInputElement)?.value || '',
    address: (document.getElementById('cust-address') as HTMLInputElement)?.value || '',
    creditLimitToman: (document.getElementById('cust-credit-limit-toman') as HTMLInputElement)?.value || '',
    creditLimitGold: (document.getElementById('cust-credit-limit-gold') as HTMLInputElement)?.value || '',
    bankName: (document.getElementById('cust-bank-name') as HTMLInputElement)?.value || '',
    cardNumber: (document.getElementById('cust-card-number') as HTMLInputElement)?.value || '',
    iban: (document.getElementById('cust-iban') as HTMLInputElement)?.value || '',
    notes: (document.getElementById('cust-notes') as HTMLInputElement)?.value || '',
  };
}

function restoreCustomerFormValues(data: any){
  if(!data) return;
  if(data.branch){
    const el = document.getElementById('cust-branch') as HTMLSelectElement | null;
    if(el) el.value = data.branch;
  }
  if(data.personType){
    const el = document.getElementById('cust-person-type') as HTMLSelectElement | null;
    if(el) el.value = data.personType;
  }
  const stringFields = ['cust-code','cust-name','cust-job','cust-national-id','cust-economic-code','cust-introducer','cust-birth-date','cust-phone','cust-phone2','cust-postal-code','cust-address','cust-credit-limit-toman','cust-credit-limit-gold','cust-bank-name','cust-card-number','cust-iban','cust-notes'];
  stringFields.forEach(fid => {
    const key = fid.replace('cust-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    const el = document.getElementById(fid) as HTMLInputElement | null;
    if(el && data[key] !== undefined) el.value = data[key];
  });
}

let custPickerMode: 'new_customer' | 'change_form' | 'filter' = 'new_customer';

function openCategoryPickerFromCustomerForm(){
  tempCustomerFormData = captureCurrentCustomerFormValues();
  const branchEl = document.getElementById('cust-branch') as HTMLInputElement | null;
  const branch = branchEl ? branchEl.value : (customersActiveBranch || 'main');
  const overlay = document.getElementById('customer-form-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  openCustCategoryPicker(branch, 'change_form');
}

function openNewCustomerFlow(branch?: string){
  const targetBranch = branch || customersActiveBranch || 'main';
  const root = customerBranchRootNode(targetBranch);
  const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];

  if(categories.length > 1){
    openCustCategoryPicker(targetBranch, 'new_customer');
  } else {
    const defaultCatId = categories.length === 1 ? categories[0].id : (root ? root.id : null);
    openCustomerForm(null, targetBranch, defaultCatId);
  }
}

function openCustCategoryPicker(branch?: string, mode: 'new_customer' | 'change_form' | 'filter' = 'new_customer'){
  custPickerTargetBranch = branch || customersActiveBranch || 'main';
  custPickerMode = mode;
  const root = customerBranchRootNode(custPickerTargetBranch);
  if(!root) return;
  const modal = document.getElementById('customer-cat-picker-modal');
  if(modal) modal.style.display = 'flex';
  syncModalOpenState();
  const titleEl = document.getElementById('cust-picker-modal-title');
  if(titleEl) titleEl.textContent = `📁 لیست دسته‌بندی‌های ${root.name}`;
  const promptEl = document.getElementById('cust-picker-prompt');
  
  const listEl = document.getElementById('cust-picker-category-list');
  if(listEl){
    const categories = db.coaNodes.filter(n => n.parentId === root.id);
    
    if(categories.length === 0){
      if(promptEl) promptEl.textContent = `در حال حاضر دسته‌ای در گروه «${root.name}» تعریف نشده است. لطفاً ابتدا از کادر زیر یک دسته‌بندی ایجاد فرمایید:`;
      listEl.innerHTML = `
        <div style="padding:18px; text-align:center; background:rgba(217,119,6,0.06); border:1.5px dashed rgba(217,119,6,0.3); border-radius:10px; color:var(--text-dim); font-size:12.5px;">
          ⚠️ هیچ دسته‌بندی در این گروه وجود ندارد. لطفاً ابتدا از طریق کادر زیر نام دسته را وارد کرده و دکمه «+ ثبت دسته» را بزنید.
        </div>
      `;
    } else {
      if(promptEl){
        if(custPickerMode === 'filter'){
          promptEl.textContent = `برای فیلتر جدول اشخاص، دسته مورد نظر را از لیست زیر انتخاب کنید:`;
        } else {
          promptEl.textContent = `لطفاً دسته‌بندی شخص را از لیست زیر انتخاب فرمایید:`;
        }
      }
      let html = '';
      if(custPickerMode === 'filter'){
        const totalCount = (db.customers || []).filter(c => (c.branch || 'main') === custPickerTargetBranch).length;
        html += `
          <div style="margin:0; padding:10px 14px; cursor:pointer; background:var(--elev); border:1px solid ${!customersActiveCategoryFilter ? 'var(--gold)' : 'var(--border)'}; display:flex; justify-content:space-between; align-items:center; border-radius:8px; transition:all 0.15s ease;" onclick="selectCustCategoryAndProceed(null)">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:16px;">🌐</span>
              <div>
                <div style="font-weight:700; font-size:13px; color:var(--text);">همه موارد گروه ${root.name}</div>
                <div style="font-size:11px; color:var(--text-faint); margin-top:1px;">مجموعاً دارای <b>${toFa(totalCount)}</b> شخص</div>
              </div>
            </div>
            <button type="button" class="btn-ghost-pill">نمایش همه</button>
          </div>
        `;
      }
      categories.forEach(cat => {
        const count = (db.customers || []).filter(c => c.parentNodeId === cat.id).length;
        const isSelected = (custPickerMode === 'filter' && customersActiveCategoryFilter === cat.id);
        html += `
          <div style="margin:0; padding:10px 14px; cursor:pointer; background:var(--elev); border:1px solid ${isSelected ? 'var(--gold)' : 'var(--border)'}; display:flex; justify-content:space-between; align-items:center; border-radius:8px; transition:all 0.15s ease;" onclick="selectCustCategoryAndProceed('${cat.id}')">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="color:var(--gold); font-size:13px;">●</span>
              <div>
                <div style="font-weight:700; font-size:13px; color:var(--text);">${cat.name}</div>
                <div style="font-size:11px; color:var(--text-faint); margin-top:1px;">کد حساب: <code style="color:var(--text-dim);">${cat.code}</code> — دارای ${toFa(count)} شخص</div>
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <button type="button" class="btn-ghost-pill" title="ویرایش نام این دسته" onclick="event.stopPropagation(); promptRenameCustomerCategory('${cat.id}', event);">ویرایش</button>
              <button type="button" class="btn btn-gold btn-sm" style="font-size:11px; padding:4px 10px; font-weight:700;">انتخاب ➔</button>
            </div>
          </div>
        `;
      });
      listEl.innerHTML = html;
    }
  }

  const quickInp = document.getElementById('quick-cat-name-input') as HTMLInputElement | null;
  if(quickInp){
    quickInp.value = '';
    setTimeout(() => quickInp.focus(), 60);
  }
}

function saveNewCategoryFromPicker(){
  const inp = document.getElementById('quick-cat-name-input') as HTMLInputElement | null;
  const name = inp ? inp.value.trim() : '';
  if(!name){
    toast('لطفاً نام دسته‌بندی جدید را وارد کنید', 'error');
    if(inp) inp.focus();
    return;
  }
  const root = customerBranchRootNode(custPickerTargetBranch);
  if(!root) return;
  const siblings = nodeChildren(root);
  const code = nextChildCode(root.code, siblings.map(s => s.code));
  const newCat = {
    id: uuid(),
    parentId: root.id,
    code,
    name,
    locked: false,
    allowAddChild: false,
    isBalanceSheetRoot: false,
    childMode: null,
    attachType: 'customer',
    closed: false,
    natureOverride: root.natureOverride || null,
    financialType: null,
    unit: null
  };
  db.coaNodes.push(newCat);
  persist('coaNodes');
  addLog(`دسته‌بندی جدید «${name}» زیر گروه «${root.name}» ایجاد شد`);
  toast(`دسته‌بندی «${name}» با موفقیت اضافه شد`, 'success');
  expandedCoaNodes.add(root.id);
  renderAccountTree();
  renderCustomerBadges();
  renderCustomers();

  if(custPickerMode === 'filter'){
    filterCustomersByCategory(newCat.id);
    openCustCategoryPicker(custPickerTargetBranch, 'filter');
    return;
  }

  const modal = document.getElementById('customer-cat-picker-modal');
  if(modal) modal.style.display = 'none';
  const preservedData = tempCustomerFormData;
  tempCustomerFormData = null;

  if(preservedData && preservedData.editingCustomerId){
    openCustomerForm(preservedData.editingCustomerId, custPickerTargetBranch, newCat.id);
    restoreCustomerFormValues(preservedData);
  } else if(preservedData){
    openCustomerForm(null, custPickerTargetBranch, newCat.id);
    restoreCustomerFormValues(preservedData);
  } else {
    openCustomerForm(null, custPickerTargetBranch, newCat.id);
  }
}

function closeCustCategoryPicker(){
  const modal = document.getElementById('customer-cat-picker-modal');
  if(modal) modal.style.display = 'none';
  if(tempCustomerFormData){
    const overlay = document.getElementById('customer-form-modal-overlay');
    if(overlay) overlay.style.display = 'flex';
  }
  syncModalOpenState();
}

function selectCustCategoryAndProceed(catId: string | null){
  const modal = document.getElementById('customer-cat-picker-modal');
  if(modal) modal.style.display = 'none';
  syncModalOpenState();

  if(custPickerMode === 'filter'){
    filterCustomersByCategory(catId);
    return;
  }

  const root = customerBranchRootNode(custPickerTargetBranch);
  const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
  let effectiveCatId = catId;
  if((!effectiveCatId || !categories.some(c => c.id === effectiveCatId)) && categories.length > 0){
    effectiveCatId = categories[0].id;
  } else if(!effectiveCatId && root){
    effectiveCatId = root.id;
  }

  const preservedData = tempCustomerFormData;
  tempCustomerFormData = null;
  
  if(preservedData && preservedData.editingCustomerId){
    openCustomerForm(preservedData.editingCustomerId, custPickerTargetBranch, effectiveCatId);
    restoreCustomerFormValues(preservedData);
  } else if(preservedData){
    openCustomerForm(null, custPickerTargetBranch, effectiveCatId);
    restoreCustomerFormValues(preservedData);
  } else {
    openCustomerForm(null, custPickerTargetBranch, effectiveCatId);
  }
}

/* ============ CUSTOMER AUTOCOMPLETE & DUPLICATE CHECKS ============ */
function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeForJs(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function normalizeFaText(str: string): string {
  if (!str) return '';
  return str
    .trim()
    .toLowerCase()
    .replace(/[ي]/g, 'ی')
    .replace(/[ك]/g, 'ک')
    .replace(/[ة]/g, 'ه')
    .replace(/[آأإ]/g, 'ا')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ');
}

function hideCustomerNameSuggestions(){
  const box = document.getElementById('cust-name-suggestions');
  if(box) box.style.display = 'none';
}

function onCustomerNameInput(val: string){
  const box = document.getElementById('cust-name-suggestions');
  if(!box) return;
  const q = normalizeFaText(val);
  if(!q){
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  // Find customers starting with the typed text (max 4)
  const matches = (db.customers || [])
    .filter(c => c.id !== editingCustomerId && normalizeFaText(c.name).startsWith(q))
    .slice(0, 4);

  if(matches.length === 0){
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }

  const branchLabels: Record<string, string> = {
    main: 'اشخاص',
    other: 'سایر اشخاص',
    staff: 'پرسنل'
  };

  let html = `
    <div style="padding:6px 12px; font-size:11px; color:var(--text-faint); background:rgba(0,0,0,0.25); border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
      <span>⚠️ اشخاص موجود با شروع نام مشابه:</span>
      <span style="font-size:10px; color:var(--gold-bright); font-weight:700;">${toFa(matches.length)} مورد</span>
    </div>
    <div style="display:flex; flex-direction:column;">
  `;

  matches.forEach((m, idx) => {
    const isExact = normalizeFaText(m.name) === q;
    html += `
      <div class="cust-suggest-item" style="padding:9px 12px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; ${idx < matches.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.05);' : ''} font-size:12.5px; transition:background 0.15s; background:${isExact ? 'rgba(239,68,68,0.12)' : 'transparent'};" onmouseover="this.style.background='rgba(217,119,6,0.14)'" onmouseout="this.style.background='${isExact ? 'rgba(239,68,68,0.12)' : 'transparent'}'" onclick="selectCustomerNameSuggestion('${escapeForJs(m.name)}')">
        <div style="display:flex; align-items:center; gap:8px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <span style="color:${isExact ? '#ef4444' : 'var(--gold-bright)'}; font-size:13px;">👤</span>
          <span style="font-weight:700; color:var(--text-bright);">${escapeHtml(m.name)}</span>
          ${isExact ? '<span style="font-size:10.5px; color:#ef4444; font-weight:700; background:rgba(239,68,68,0.15); padding:1px 6px; border-radius:4px;">نام یکسان!</span>' : ''}
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <span style="font-size:10.5px; color:var(--text-dim); background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px;">${branchLabels[m.branch || 'main'] || 'شخص'}</span>
        </div>
      </div>
    `;
  });

  html += `</div>`;
  box.innerHTML = html;
  box.style.display = 'block';
}

function selectCustomerNameSuggestion(suggestedName: string){
  const inp = document.getElementById('cust-name') as HTMLInputElement | null;
  if(inp){
    inp.value = suggestedName;
    inp.focus();
  }
  hideCustomerNameSuggestions();
  toast(`⚠️ شخصی با نام «${suggestedName}» از قبل در سیستم وجود دارد و نمی‌توانید نام تکراری ثبت کنید.`, 'error');
}

let activeCustomerFormTab: 'identity' | 'contact' | 'finance' | 'notes' | 'all' = 'identity';
const customerFormTabOrder: ('identity' | 'contact' | 'finance' | 'notes')[] = ['identity', 'contact', 'finance', 'notes'];

function toggleCustomerFormMaximize(){
  const box = document.getElementById('customer-form-modal-box');
  const expandIcon = document.getElementById('cust-max-icon-expand');
  const compressIcon = document.getElementById('cust-max-icon-compress');
  if(!box) return;
  const isMaximized = box.classList.toggle('cust-modal-maximized');
  if(expandIcon && compressIcon){
    expandIcon.style.display = isMaximized ? 'none' : 'block';
    compressIcon.style.display = isMaximized ? 'block' : 'none';
  }
}

function switchCustomerFormTab(tabKey: 'identity' | 'contact' | 'finance' | 'notes' | 'all'){
  activeCustomerFormTab = tabKey;
  
  // Update Tab buttons
  const tabBtns = document.querySelectorAll('.cust-form-tab-btn');
  tabBtns.forEach(btn => {
    const k = btn.getAttribute('data-tab');
    if(k === tabKey){
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update Tab Panels
  const panels: Record<string, HTMLElement | null> = {
    identity: document.getElementById('cust-panel-identity'),
    contact: document.getElementById('cust-panel-contact'),
    finance: document.getElementById('cust-panel-finance'),
    notes: document.getElementById('cust-panel-notes'),
  };

  if(tabKey === 'all'){
    Object.values(panels).forEach(p => {
      if(p){
        p.style.display = 'flex';
      }
    });
  } else {
    Object.entries(panels).forEach(([key, p]) => {
      if(p){
        p.style.display = (key === tabKey) ? 'flex' : 'none';
      }
    });
  }

  // Update footer step buttons
  const prevBtn = document.getElementById('cust-step-prev-btn');
  const nextBtn = document.getElementById('cust-step-next-btn');
  if(tabKey === 'all'){
    if(prevBtn) prevBtn.style.display = 'none';
    if(nextBtn) nextBtn.style.display = 'none';
  } else {
    const idx = customerFormTabOrder.indexOf(tabKey as any);
    if(prevBtn) prevBtn.style.display = (idx > 0) ? 'inline-flex' : 'none';
    if(nextBtn) nextBtn.style.display = (idx < customerFormTabOrder.length - 1) ? 'inline-flex' : 'none';
  }
}

function stepCustomerFormTab(delta: number){
  if(activeCustomerFormTab === 'all') return;
  const currIdx = customerFormTabOrder.indexOf(activeCustomerFormTab as any);
  if(currIdx === -1) return;
  const newIdx = currIdx + delta;
  if(newIdx >= 0 && newIdx < customerFormTabOrder.length){
    switchCustomerFormTab(customerFormTabOrder[newIdx]);
  }
}

function openCustomerForm(id, branch, categoryId){
  hideCustomerNameSuggestions();
  editingCustomerId = id || null;
  const overlay = document.getElementById('customer-form-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  syncModalOpenState();
  switchCustomerFormTab('identity');
  const saveBtn = document.getElementById('cust-save-btn');
  const titleEl = document.getElementById('customer-form-title');
  const branchEl = document.getElementById('cust-branch') as HTMLSelectElement | null;
  const personTypeEl = document.getElementById('cust-person-type') as HTMLSelectElement | null;
  const parentInput = document.getElementById('cust-parent-node-id') as HTMLInputElement | null;
  const targetBranch = branch || customersActiveBranch || 'main';

  const delBtn = document.getElementById('cust-modal-delete-btn');
  if(editingCustomerId){
    if(delBtn) delBtn.style.display = 'inline-flex';
    const c = db.customers.find(x => x.id === editingCustomerId);
    if(c){
      const effectiveBranch = c.branch || 'main';
      if(titleEl) titleEl.textContent = `👤 ویرایش شخص: ${c.name}`;
      if(branchEl) branchEl.value = effectiveBranch;
      if(personTypeEl) personTypeEl.value = c.personType || 'real';
      (document.getElementById('cust-code') as HTMLInputElement).value = c.code || nextCustomerCode(effectiveBranch);
      (document.getElementById('cust-name') as HTMLInputElement).value = c.name || '';
      (document.getElementById('cust-job') as HTMLInputElement).value = c.job || '';
      (document.getElementById('cust-national-id') as HTMLInputElement).value = c.nationalId || '';
      (document.getElementById('cust-economic-code') as HTMLInputElement).value = c.economicCode || '';
      (document.getElementById('cust-introducer') as HTMLInputElement).value = c.introducer || '';
      (document.getElementById('cust-birth-date') as HTMLInputElement).value = c.birthDate || '';
      (document.getElementById('cust-phone') as HTMLInputElement).value = c.phone || '';
      (document.getElementById('cust-phone2') as HTMLInputElement).value = c.phone2 || '';
      (document.getElementById('cust-postal-code') as HTMLInputElement).value = c.postalCode || '';
      (document.getElementById('cust-address') as HTMLInputElement).value = c.address || '';
      (document.getElementById('cust-credit-limit-toman') as HTMLInputElement).value = c.creditLimitToman ? fmtMoneyInput(c.creditLimitToman) : '';
      (document.getElementById('cust-credit-limit-gold') as HTMLInputElement).value = c.creditLimitGold ? String(c.creditLimitGold) : '';
      (document.getElementById('cust-bank-name') as HTMLInputElement).value = c.bankName || '';
      (document.getElementById('cust-card-number') as HTMLInputElement).value = c.cardNumber || '';
      (document.getElementById('cust-iban') as HTMLInputElement).value = c.iban || '';
      (document.getElementById('cust-notes') as HTMLInputElement).value = c.notes || '';
      
      const effectiveCategory = categoryId || c.parentNodeId;
      populateCustomerCategorySelect(effectiveBranch, effectiveCategory);
      updateCustomerFormPath();
    }
    if(saveBtn) saveBtn.textContent = 'بروزرسانی شخص';
  } else {
    if(delBtn) delBtn.style.display = 'none';
    if(branchEl) branchEl.value = targetBranch;
    if(personTypeEl) personTypeEl.value = 'real';
    if(titleEl){
      if(targetBranch === 'staff') titleEl.textContent = '👔 ثبت پرسنل جدید';
      else if(targetBranch === 'other') titleEl.textContent = '🤝 ثبت سایر اشخاص';
      else titleEl.textContent = '👥 ثبت شخص جدید';
    }
    const allInputIds = [
      'cust-code','cust-name','cust-job','cust-national-id','cust-economic-code','cust-introducer','cust-birth-date',
      'cust-phone','cust-phone2','cust-postal-code','cust-address','cust-credit-limit-toman','cust-credit-limit-gold',
      'cust-bank-name','cust-card-number','cust-iban','cust-notes'
    ];
    allInputIds.forEach(fid => {
      const el = document.getElementById(fid) as HTMLInputElement | null;
      if(el) el.value = '';
    });
    const codeEl = document.getElementById('cust-code') as HTMLInputElement | null;
    if(codeEl){
      codeEl.value = nextCustomerCode(targetBranch);
      codeEl.readOnly = true;
    }
    
    populateCustomerCategorySelect(targetBranch, categoryId);
    updateCustomerFormPath();
    if(saveBtn) saveBtn.textContent = 'ذخیره شخص';
  }
  setTimeout(() => {
    const inp = document.getElementById('cust-name');
    if(inp) inp.focus();
  }, 50);
}

function isCustomerFormDirty(): boolean {
  const currentInputs: Record<string, string> = {
    name: (document.getElementById('cust-name') as HTMLInputElement)?.value?.trim() || '',
    job: (document.getElementById('cust-job') as HTMLInputElement)?.value?.trim() || '',
    nationalId: (document.getElementById('cust-national-id') as HTMLInputElement)?.value?.trim() || '',
    economicCode: (document.getElementById('cust-economic-code') as HTMLInputElement)?.value?.trim() || '',
    introducer: (document.getElementById('cust-introducer') as HTMLInputElement)?.value?.trim() || '',
    birthDate: (document.getElementById('cust-birth-date') as HTMLInputElement)?.value?.trim() || '',
    phone: (document.getElementById('cust-phone') as HTMLInputElement)?.value?.trim() || '',
    phone2: (document.getElementById('cust-phone2') as HTMLInputElement)?.value?.trim() || '',
    postalCode: (document.getElementById('cust-postal-code') as HTMLInputElement)?.value?.trim() || '',
    address: (document.getElementById('cust-address') as HTMLInputElement)?.value?.trim() || '',
    creditLimitToman: (document.getElementById('cust-credit-limit-toman') as HTMLInputElement)?.value?.trim() || '',
    creditLimitGold: (document.getElementById('cust-credit-limit-gold') as HTMLInputElement)?.value?.trim() || '',
    bankName: (document.getElementById('cust-bank-name') as HTMLInputElement)?.value?.trim() || '',
    cardNumber: (document.getElementById('cust-card-number') as HTMLInputElement)?.value?.trim() || '',
    iban: (document.getElementById('cust-iban') as HTMLInputElement)?.value?.trim() || '',
    notes: (document.getElementById('cust-notes') as HTMLInputElement)?.value?.trim() || '',
  };

  if (!editingCustomerId) {
    // Mode: Adding new customer - check if any field has any text entered
    return Object.values(currentInputs).some(val => val.length > 0);
  }

  // Mode: Editing existing customer - check if any field was changed compared to saved customer
  const c = db.customers.find(x => x.id === editingCustomerId);
  if (!c) return false;

  const originalToman = c.creditLimitToman ? fmtMoneyInput(c.creditLimitToman).trim() : '';
  const originalGold = c.creditLimitGold ? String(c.creditLimitGold).trim() : '';

  if (currentInputs.name !== (c.name || '').trim()) return true;
  if (currentInputs.job !== (c.job || '').trim()) return true;
  if (currentInputs.nationalId !== (c.nationalId || '').trim()) return true;
  if (currentInputs.economicCode !== (c.economicCode || '').trim()) return true;
  if (currentInputs.introducer !== (c.introducer || '').trim()) return true;
  if (currentInputs.birthDate !== (c.birthDate || '').trim()) return true;
  if (currentInputs.phone !== (c.phone || '').trim()) return true;
  if (currentInputs.phone2 !== (c.phone2 || '').trim()) return true;
  if (currentInputs.postalCode !== (c.postalCode || '').trim()) return true;
  if (currentInputs.address !== (c.address || '').trim()) return true;
  if (currentInputs.creditLimitToman !== originalToman) return true;
  if (currentInputs.creditLimitGold !== originalGold) return true;
  if (currentInputs.bankName !== (c.bankName || '').trim()) return true;
  if (currentInputs.cardNumber !== (c.cardNumber || '').trim()) return true;
  if (currentInputs.iban !== (c.iban || '').trim()) return true;
  if (currentInputs.notes !== (c.notes || '').trim()) return true;

  const personTypeEl = document.getElementById('cust-person-type') as HTMLSelectElement | null;
  if (personTypeEl && personTypeEl.value !== (c.personType || 'real')) return true;

  return false;
}

function closeCustomerFormWithConfirm(){
  if(isCustomerFormDirty()){
    confirmModal({
      title: 'بستن فرم و انصراف',
      message: 'شما اطلاعاتی در فرم وارد کرده‌اید. در صورت بستن، تغییرات ذخیره نخواهند شد. آیا از بستن فرم اطمینان دارید؟',
      confirmText: 'بله، فرم بسته شود',
      cancelText: 'ادامه تکمیل فرم',
      danger: true,
      onConfirm: () => {
        closeCustomerForm();
      }
    });
  } else {
    closeCustomerForm();
  }
}

function closeCustomerForm(){
  hideCustomerNameSuggestions();
  const overlay = document.getElementById('customer-form-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  syncModalOpenState();
  const delBtn = document.getElementById('cust-modal-delete-btn');
  if(delBtn) delBtn.style.display = 'none';
  const allInputIds = [
    'cust-code','cust-name','cust-job','cust-national-id','cust-economic-code','cust-introducer','cust-birth-date',
    'cust-phone','cust-phone2','cust-postal-code','cust-address','cust-credit-limit-toman','cust-credit-limit-gold',
    'cust-bank-name','cust-card-number','cust-iban','cust-notes'
  ];
  allInputIds.forEach(fid => {
    const el = document.getElementById(fid);
    if(el) (el as HTMLInputElement).value = '';
  });
  editingCustomerId = null;
  tempCustomerFormData = null;
}

function saveCustomer(){
  const nameInput = document.getElementById('cust-name') as HTMLInputElement | null;
  const name = nameInput ? nameInput.value.trim() : '';
  if(!name){ toast('نام و نام خانوادگی یا عنوان شخص را وارد کنید', 'error'); return; }

  const branchEl = document.getElementById('cust-branch') as HTMLInputElement | null;
  const branch = (branchEl && branchEl.value) ? branchEl.value : (customersActiveBranch || 'main');

  const codeInput = document.getElementById('cust-code') as HTMLInputElement | null;
  let code = toEn(codeInput ? codeInput.value.trim() : '');
  if(!code) code = nextCustomerCode(branch);

  // Prevent duplicate customer codes
  const dupCode = (db.customers || []).find(c => c.id !== editingCustomerId && toEn(String(c.code || '')).trim() === code);
  if(dupCode){
    toast(`⚠️ کد حساب «${code}» قبلاً برای شخص «${dupCode.name}» استفاده شده است.`, 'error');
    return;
  }

  // Prevent duplicate customer names (case and whitespace insensitive in Persian)
  const normalizedNewName = normalizeFaText(name);
  const duplicate = (db.customers || []).find(c => c.id !== editingCustomerId && normalizeFaText(c.name) === normalizedNewName);
  if(duplicate){
    toast(`⚠️ امکان ثبت شخص با نام تکراری وجود ندارد. شخصی با نام «${duplicate.name}» قبلاً ثبت شده است.`, 'error');
    if(nameInput){
      nameInput.focus();
      nameInput.select();
    }
    return;
  }
  
  const personTypeEl = document.getElementById('cust-person-type') as HTMLSelectElement | null;
  const personType = personTypeEl ? personTypeEl.value : 'real';

  const job = (document.getElementById('cust-job') as HTMLInputElement)?.value.trim() || '';
  const nationalId = (document.getElementById('cust-national-id') as HTMLInputElement)?.value.trim() || '';
  const economicCode = (document.getElementById('cust-economic-code') as HTMLInputElement)?.value.trim() || '';
  const introducer = (document.getElementById('cust-introducer') as HTMLInputElement)?.value.trim() || '';
  const birthDate = (document.getElementById('cust-birth-date') as HTMLInputElement)?.value.trim() || '';
  const phone = (document.getElementById('cust-phone') as HTMLInputElement)?.value.trim() || '';
  const phone2 = (document.getElementById('cust-phone2') as HTMLInputElement)?.value.trim() || '';
  const postalCode = (document.getElementById('cust-postal-code') as HTMLInputElement)?.value.trim() || '';
  const address = (document.getElementById('cust-address') as HTMLInputElement)?.value.trim() || '';
  
  const creditLimitToman = currencyValue(document.getElementById('cust-credit-limit-toman'));
  const creditLimitGold = parseFloat((document.getElementById('cust-credit-limit-gold') as HTMLInputElement)?.value) || 0;
  
  const bankName = (document.getElementById('cust-bank-name') as HTMLInputElement)?.value.trim() || '';
  const cardNumber = (document.getElementById('cust-card-number') as HTMLInputElement)?.value.trim() || '';
  const iban = (document.getElementById('cust-iban') as HTMLInputElement)?.value.trim() || '';
  const notes = (document.getElementById('cust-notes') as HTMLInputElement)?.value.trim() || '';

  const parentInput = document.getElementById('cust-parent-node-id') as HTMLInputElement | null;
  const catSelect = document.getElementById('cust-category-select') as HTMLSelectElement | null;
  let parentNodeId = (parentInput && parentInput.value) ? parentInput.value : (catSelect && catSelect.value ? catSelect.value : null);
  const root = customerBranchRootNode(branch);

  if(root){
    const categories = db.coaNodes.filter(n => n.parentId === root.id);
    if(categories.length > 0){
      if(!parentNodeId || !categories.some(c => c.id === parentNodeId)){
        parentNodeId = categories[0].id;
      }
    } else {
      parentNodeId = root.id;
    }
  }

  let savedId = '';

  if(editingCustomerId){
    const c = db.customers.find(x => x.id === editingCustomerId);
    if(c){
      c.code = code;
      c.name = name;
      c.branch = branch;
      c.personType = personType;
      c.job = job;
      c.nationalId = nationalId;
      c.economicCode = economicCode;
      c.introducer = introducer;
      c.birthDate = birthDate;
      c.phone = phone;
      c.phone2 = phone2;
      c.postalCode = postalCode;
      c.address = address;
      c.creditLimitToman = creditLimitToman;
      c.creditLimitGold = creditLimitGold;
      c.bankName = bankName;
      c.cardNumber = cardNumber;
      c.iban = iban;
      c.notes = notes;
      c.parentNodeId = parentNodeId;
      c.updated_at = nowISO();
      c.is_synced = false;
      savedId = c.id;
      addLog(`شخص ویرایش شد: ${name}`);
      toast('اطلاعات شخص با موفقیت بروزرسانی شد', 'success');
    }
  } else {
    const newCust = {
      id: uuid(),
      code,
      name,
      branch,
      personType,
      job,
      nationalId,
      economicCode,
      introducer,
      birthDate,
      phone,
      phone2,
      postalCode,
      address,
      creditLimitToman,
      creditLimitGold,
      bankName,
      cardNumber,
      iban,
      notes,
      parentNodeId,
      tomanBalance: 0,
      goldBalance18: 0,
      updated_at: nowISO(),
      is_synced: false
    };
    db.customers.push(newCust);
    savedId = newCust.id;
    addLog(`شخص جدید ثبت شد: ${name}`);
    toast(`شخص «${name}» با موفقیت در لیست اشخاص ذخیره شد`, 'success');
  }
  persist('customers');
  closeCustomerForm();

  // Make sure new customer is shown in view immediately
  customersActiveBranch = branch;
  customersActiveCategoryFilter = null;
  selectedCustomerId = savedId;

  const searchInput = document.getElementById('customers-search') as HTMLInputElement | null;
  if(searchInput) searchInput.value = '';

  document.querySelectorAll('.side-tab-item[data-custbranch], .tab-btn[data-custbranch]').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-custbranch') === customersActiveBranch);
  });

  renderCustomerBadges();
  renderCustomers();
  renderAccountTree();

  setTimeout(() => {
    const selRow = document.querySelector('#customers-table tr.selected-row');
    if(selRow){
      selRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, 100);
}

function filterCustomers(query){
  const q = toEn(String(query || '')).trim().toLowerCase();
  if(!q) return db.customers;
  return db.customers.filter(c =>
    String(c.code || '').toLowerCase().includes(q) ||
    toEn(String(c.code || '')).toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    String(c.phone || '').toLowerCase().includes(q) ||
    String(c.phone2 || '').toLowerCase().includes(q) ||
    String(c.address || '').toLowerCase().includes(q) ||
    String(c.nationalId || '').toLowerCase().includes(q) ||
    String(c.economicCode || '').toLowerCase().includes(q) ||
    String(c.job || '').toLowerCase().includes(q) ||
    String(c.introducer || '').toLowerCase().includes(q) ||
    String(c.bankName || '').toLowerCase().includes(q) ||
    String(c.cardNumber || '').toLowerCase().includes(q) ||
    String(c.iban || '').toLowerCase().includes(q) ||
    String(c.postalCode || '').toLowerCase().includes(q) ||
    String(c.notes || '').toLowerCase().includes(q)
  );
}

function sortCustomersBy(field){
  if(resizeJustFinished) return;
  if(customersSort.field !== field){
    customersSort = { field, dir: 1 };
  } else {
    customersSort.dir = (customersSort.dir + 1) % 3;
    if(customersSort.dir === 0) customersSort.field = null;
  }
  renderCustomers();
  if(document.getElementById('customer-modal-overlay')?.style.display === 'flex'){
    renderCustomerModalList();
  }
}

function applySort(list, sortState){
  if(!sortState.field || !sortState.dir) return list;
  const field = sortState.field, dir = sortState.dir;
  return [...list].sort((a, b) => {
    let av = a[field], bv = b[field];
    if(field === 'is_synced'){ av = av ? 1 : 0; bv = bv ? 1 : 0; }
    if(typeof av === 'string') av = av.toLowerCase();
    if(typeof bv === 'string') bv = bv.toLowerCase();
    if(av == null) av = '';
    if(bv == null) bv = '';
    if(av < bv) return dir === 1 ? -1 : 1;
    if(av > bv) return dir === 1 ? 1 : -1;
    return 0;
  });
}

function customersHeaderHtml(){
  const arrow = (field) => customersSort.field === field ? (customersSort.dir === 1 ? ' ▲' : customersSort.dir === 2 ? ' ▼' : '') : '';
  return `<tr>
    <th style="width:85px; text-align:center;" class="sortable-th" onclick="sortCustomersBy('code')">کد حساب<span class="sort-indicator">${arrow('code')}</span></th>
    <th class="sortable-th" style="text-align:right;" onclick="sortCustomersBy('name')">نام و مشخصات شخص<span class="sort-indicator">${arrow('name')}</span></th>
    <th class="sortable-th" style="text-align:center; width:105px;" onclick="sortCustomersBy('branch')">گروه اصلی<span class="sort-indicator">${arrow('branch')}</span></th>
    <th class="sortable-th" style="text-align:left; width:160px;" onclick="sortCustomersBy('goldBalance18')">مانده طلا (۱۸ عیار)<span class="sort-indicator">${arrow('goldBalance18')}</span></th>
    <th class="sortable-th" style="text-align:left; width:170px;" onclick="sortCustomersBy('tomanBalance')">مانده ریالی<span class="sort-indicator">${arrow('tomanBalance')}</span></th>
    <th class="sortable-th" style="width:85px; text-align:center;" onclick="sortCustomersBy('is_synced')">وضعیت<span class="sort-indicator">${arrow('is_synced')}</span></th>
  </tr>`;
}

function formatGoldWithUnit(grams: number): { text: string; value: string; unit: string; isSout: boolean } {
  const absG = Math.abs(grams);
  if (absG === 0) {
    return { text: '۰ گرم', value: '۰', unit: 'گرم', isSout: false };
  }
  if (absG < 1) {
    // تبدیل خودکار اوزان زیر یک گرم به سوت (هر ۱ گرم = ۱۰۰۰ سوت)
    const soots = Math.round(absG * 1000 * 100) / 100;
    const formattedSoots = soots % 1 === 0 ? soots.toFixed(0) : parseFloat(soots.toFixed(1)).toString();
    return {
      text: `${toFa(formattedSoots)} سوت`,
      value: toFa(formattedSoots),
      unit: 'سوت',
      isSout: true
    };
  }
  const formattedGrams = absG.toFixed(3);
  return {
    text: `${toFa(formattedGrams)} گرم`,
    value: toFa(formattedGrams),
    unit: 'گرم',
    isSout: false
  };
}

let selectedCustomerId: string | null = null;
let activeStatementCustomerId: string | null = null;
let selectedStatementRow: { id: string; sourceType: string; sourceId: string; docNo: string; typeLabel: string; } | null = null;
let activeLedgerCustomerId: string | null = null;
let statementViewMode: 'summary' | 'detailed' = 'summary';
let statementShowGoldColumns: boolean = true;
let selectedItemId: string | null = null;
let activeStatementItemId: string | null = null;
let selectedItemStatementRow: { id: string; sourceType: string; sourceId: string; docNo: string; typeLabel: string; } | null = null;
let itemStatementShowValues: boolean = true;

function setStatementViewMode(mode: 'summary' | 'detailed'){
  statementViewMode = mode;
  const btnSummary = document.getElementById('btn-mode-summary');
  const btnDetailed = document.getElementById('btn-mode-detailed');
  if(btnSummary && btnDetailed){
    if(mode === 'summary'){
      btnSummary.classList.add('active');
      btnDetailed.classList.remove('active');
    } else {
      btnSummary.classList.remove('active');
      btnDetailed.classList.add('active');
    }
  }
  renderCustomerStatementContent();
}

function toggleStatementGoldColumns(){
  statementShowGoldColumns = !statementShowGoldColumns;
  const btnToggle = document.getElementById('btn-statement-toggle-gold');
  const iconEl = document.getElementById('statement-gold-toggle-icon');
  const textEl = document.getElementById('statement-gold-toggle-text');
  
  if(btnToggle){
    if(statementShowGoldColumns){
      btnToggle.classList.remove('toggle-off');
      btnToggle.title = 'کلیک برای پنهان کردن ستون‌های گردش و مانده طلا';
      if(iconEl) iconEl.textContent = '⚖️';
      if(textEl) textEl.textContent = 'ستون طلا: روشن';
      toast('ستون‌های گردش و مانده طلا نمایش داده شدند');
    } else {
      btnToggle.classList.add('toggle-off');
      btnToggle.title = 'کلیک برای نمایش ستون‌های گردش و مانده طلا';
      if(iconEl) iconEl.textContent = '🪙';
      if(textEl) textEl.textContent = 'ستون طلا: خاموش';
      toast('ستون‌های طلا پنهان شدند (نمایش ریالی خالص)');
    }
  }
  renderCustomerStatementContent();
}

function selectCustomer(id: string){
  selectedCustomerId = (selectedCustomerId === id) ? null : id;
  renderCustomers();
}

function editSelectedCustomerAction(customerId?: string){
  const id = customerId || selectedCustomerId;
  if(!id){
    const list = getFilteredSortedCustomers('', customersActiveBranch);
    if(list.length > 0){
      openCustomerForm(list[0].id);
    } else if(db.customers.length > 0){
      openCustomerForm(db.customers[0].id);
    } else {
      toast('ابتدا یک شخص را از جدول انتخاب نمایید یا روی دکمه «+ شخص جدید» کلیک کنید');
    }
    return;
  }
  openCustomerForm(id);
}

function deleteCustomerAction(customerId?: string, event?: Event){
  if(event) event.stopPropagation();
  const id = customerId || selectedCustomerId;
  if(!id){
    const list = getFilteredSortedCustomers('', customersActiveBranch);
    if(list.length === 1){
      performCustomerDelete(list[0]);
    } else {
      toast('لطفاً ابتدا روی ردیف شخص مورد نظر در جدول کلیک کنید تا انتخاب شود', 'error');
    }
    return;
  }
  const cust = db.customers.find(c => c.id === id);
  if(!cust){
    toast('شخص مورد نظر یافت نشد', 'error');
    return;
  }
  performCustomerDelete(cust);
}

function performCustomerDelete(cust: any){
  const id = cust.id;
  const linkedInvoices = (db.invoices || []).filter(i => i.customerId === id);
  const linkedTxns = (db.financialTransactions || []).filter(t => t.customerId === id);
  const linkedChecks = (db.checks || []).filter(chk => chk.customerId === id);
  const hasBalance = Math.abs(cust.tomanBalance || 0) > 0 || Math.abs(cust.goldBalance18 || 0) > 0.0001;
  const hasActivity = linkedInvoices.length > 0 || linkedTxns.length > 0 || linkedChecks.length > 0 || hasBalance;

  let msg = `آیا از حذف شخص «${cust.name}» از لیست اشخاص اطمینان دارید؟`;
  if(hasActivity){
    msg = `⚠️ هشدار حسابداری:\nشخص «${cust.name}» دارای سوابق در دفاتر است:\n` +
      `• مانده ریالی: ${toFa(cust.tomanBalance || 0)} ریال\n` +
      `• مانده طلای ۱۸ عیار: ${toFa(cust.goldBalance18 || 0)} گرم\n` +
      `• تعداد فاکتورها: ${toFa(linkedInvoices.length)}\n` +
      `• تراکنش‌ها و چک‌ها: ${toFa(linkedTxns.length + linkedChecks.length)}\n\n` +
      `آیا از حذف این شخص اطمینان دارید؟`;
  }

  showConfirmModal({
    title: `حذف شخص: ${cust.name}`,
    message: msg,
    confirmText: 'بله، حذف شود',
    cancelText: 'انصراف',
    isDanger: true,
    onConfirm: () => {
      db.customers = db.customers.filter(c => c.id !== id);
      if(selectedCustomerId === id) selectedCustomerId = null;
      persist('customers');
      addLog(`شخص حذف شد: ${cust.name}`);
      toast(`شخص «${cust.name}» با موفقیت حذف شد`, 'success');
      renderCustomerBadges();
      renderCustomers();
      renderAccountTree();
    }
  });
}

function deleteCustomerFromModal(){
  if(!editingCustomerId) return;
  const targetId = editingCustomerId;
  const cust = db.customers.find(c => c.id === targetId);
  if(!cust) return;
  closeCustomerForm();
  performCustomerDelete(cust);
}

function openCustomerStatementAction(customerId?: string){
  const id = customerId || selectedCustomerId;
  if(!id){
    const list = getFilteredSortedCustomers('', customersActiveBranch);
    if(list.length > 0){
      openCustomerStatement(list[0].id);
    } else if(db.customers.length > 0){
      openCustomerStatement(db.customers[0].id);
    } else {
      toast('هنوز شخصی برای مشاهده گردش حساب ثبت نشده است');
    }
    return;
  }
  openCustomerStatement(id);
}

function openCustomerStatement(customerId: string){
  const cust = db.customers.find(c => c.id === customerId);
  if(!cust){
    toast('شخص مورد نظر یافت نشد');
    return;
  }
  activeStatementCustomerId = customerId;
  selectedCustomerId = customerId;
  selectedStatementRow = null;

  const overlay = document.getElementById('customer-statement-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  syncModalOpenState();

  const sel = document.getElementById('cust-statement-select') as HTMLSelectElement | null;
  if(sel){
    sel.innerHTML = db.customers.map(c => `
      <option value="${c.id}" ${c.id === customerId ? 'selected' : ''}>${c.name} (${c.branch === 'staff' ? '👔 پرسنل' : c.branch === 'other' ? '🤝 سایر' : '👥 اشخاص'})</option>
    `).join('');
  }

  const pathEl = document.getElementById('cust-statement-path');
  if(pathEl){
    pathEl.innerHTML = `<span style="color:var(--gold-bright);">📍 ${getCustomerCategoryPath(cust.parentNodeId, cust.branch)}</span>`;
  }

  const titleEl = document.getElementById('cust-statement-title');
  if(titleEl){
    titleEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
      گردش حساب: <span style="color:#fff;">${cust.name}</span>
    `;
  }

  const badgeWrap = document.getElementById('cust-statement-badge-wrap');
  if(badgeWrap){
    let bHtml = '';
    if(cust.phone) bHtml += `<span class="badge" style="font-size:11px; font-weight:normal;">📞 ${cust.phone}</span>`;
    if(cust.nationalId) bHtml += `<span class="badge" style="font-size:11px; font-weight:normal;">کد ملی: ${cust.nationalId}</span>`;
    badgeWrap.innerHTML = bHtml;
  }

  updateStatementSelectedRowUI();
  renderCustomerStatementContent();
}

function closeCustomerStatement(){
  const overlay = document.getElementById('customer-statement-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  selectedStatementRow = null;
  syncModalOpenState();
}

function printCustomerStatement(){
  window.print();
}

function onStatementRangeChange(){
  const rangeEl = document.getElementById('cust-statement-range') as HTMLSelectElement | null;
  const customDatesWrap = document.getElementById('cust-statement-custom-dates');
  const range = rangeEl ? rangeEl.value : 'all';

  if(range === 'custom'){
    if(customDatesWrap) customDatesWrap.style.display = 'flex';
    const fromInput = document.getElementById('cust-statement-from') as HTMLInputElement | null;
    const toInput = document.getElementById('cust-statement-to') as HTMLInputElement | null;
    if(fromInput && !fromInput.value){
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      fromInput.value = toDateInputValue(thirtyDaysAgo);
    }
    if(toInput && !toInput.value){
      toInput.value = toDateInputValue(new Date());
    }
  } else {
    if(customDatesWrap) customDatesWrap.style.display = 'none';
  }

  renderCustomerStatementContent();
}

function resetCustomerStatementFilters(){
  const opFilterEl = document.getElementById('cust-statement-op-filter') as HTMLSelectElement | null;
  if(opFilterEl) opFilterEl.value = 'all';

  const rangeEl = document.getElementById('cust-statement-range') as HTMLSelectElement | null;
  if(rangeEl) rangeEl.value = 'all';

  const customDatesWrap = document.getElementById('cust-statement-custom-dates');
  if(customDatesWrap) customDatesWrap.style.display = 'none';

  const fromInput = document.getElementById('cust-statement-from') as HTMLInputElement | null;
  if(fromInput) fromInput.value = '';

  const toInput = document.getElementById('cust-statement-to') as HTMLInputElement | null;
  if(toInput) toInput.value = '';

  selectedStatementRow = null;
  updateStatementSelectedRowUI();
  renderCustomerStatementContent();
  toast('فیلترها و بازه زمانی گردش حساب به حالت اولیه بازنشانی شدند');
}

function selectStatementRow(rowId: string, sourceType: string, sourceId: string, docNo: string, typeLabel: string){
  selectedStatementRow = { id: rowId, sourceType, sourceId, docNo, typeLabel };
  
  // Update selected class on table rows
  const tbody = document.getElementById('cust-statement-tbody');
  if(tbody){
    tbody.querySelectorAll('tr').forEach(tr => {
      if(tr.getAttribute('data-row-id') === rowId){
        tr.classList.add('statement-row-active');
      } else {
        tr.classList.remove('statement-row-active');
      }
    });
  }

  updateStatementSelectedRowUI();
}

function updateStatementSelectedRowUI(){
  const infoEl = document.getElementById('cust-statement-selected-info');
  const btnEdit = document.getElementById('btn-statement-edit-voucher') as HTMLButtonElement | null;
  const btnView = document.getElementById('btn-statement-view-vouchers') as HTMLButtonElement | null;
  const btnDouble = document.getElementById('btn-statement-view-double') as HTMLButtonElement | null;

  if(selectedStatementRow){
    if(infoEl){
      infoEl.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:4px; color:var(--gold-bright); font-weight:700;">
          <span style="width:6px; height:6px; border-radius:50%; background:var(--gold-bright);"></span>
          سند انتخابی: ${selectedStatementRow.typeLabel} (#${toFa(selectedStatementRow.docNo)})
        </span>
      `;
    }
    if(btnEdit){
      btnEdit.classList.add('active-accent');
      btnEdit.disabled = false;
    }
    if(btnView){
      btnView.disabled = false;
    }
    if(btnDouble){
      btnDouble.disabled = false;
    }
  } else {
    if(infoEl){
      infoEl.innerHTML = `<span style="color:var(--text-faint);">سندی انتخاب نشده است (روی ردیف‌ها کلیک کنید)</span>`;
    }
    if(btnEdit){
      btnEdit.classList.remove('active-accent');
      btnEdit.disabled = false;
    }
    if(btnView){
      btnView.disabled = false;
    }
    if(btnDouble){
      btnDouble.disabled = false;
    }
  }
}

function editSelectedStatementDocument(){
  if(selectedStatementRow && selectedStatementRow.sourceId && selectedStatementRow.sourceType){
    editDocumentBySource(selectedStatementRow.sourceType, selectedStatementRow.sourceId);
    return;
  }
  const firstRow = document.querySelector('#cust-statement-tbody tr') as HTMLElement | null;
  if(firstRow && firstRow.getAttribute('data-source-id') && firstRow.getAttribute('data-source-type')){
    editDocumentBySource(firstRow.getAttribute('data-source-type')!, firstRow.getAttribute('data-source-id')!);
    return;
  }
  toast('لطفاً ابتدا یک سند را از جدول انتخاب کنید');
}

function viewSelectedStatementDocInVouchers(){
  if(selectedStatementRow && selectedStatementRow.sourceId && selectedStatementRow.sourceType){
    viewStatementDocInVouchers(selectedStatementRow.sourceType, selectedStatementRow.sourceId);
    return;
  }
  const firstRow = document.querySelector('#cust-statement-tbody tr') as HTMLElement | null;
  if(firstRow && firstRow.getAttribute('data-source-id') && firstRow.getAttribute('data-source-type')){
    viewStatementDocInVouchers(firstRow.getAttribute('data-source-type')!, firstRow.getAttribute('data-source-id')!);
    return;
  }
  toast('لطفاً ابتدا یک سند را از جدول انتخاب کنید');
}

function viewSelectedStatementDoubleEntry(){
  if(selectedStatementRow && selectedStatementRow.sourceId && selectedStatementRow.sourceType){
    openVoucherDetailModal(selectedStatementRow.sourceId, selectedStatementRow.sourceType);
    return;
  }
  const firstRow = document.querySelector('#cust-statement-tbody tr') as HTMLElement | null;
  if(firstRow && firstRow.getAttribute('data-source-id') && firstRow.getAttribute('data-source-type')){
    openVoucherDetailModal(firstRow.getAttribute('data-source-id')!, firstRow.getAttribute('data-source-type')!);
    return;
  }
  toast('لطفاً ابتدا یک سند را از جدول انتخاب کنید');
}

function viewStatementDocInVouchers(sourceType: string, sourceId: string){
  closeCustomerStatement();
  go('vouchers');

  const typeFilter = document.getElementById('vouchers-filter-type') as HTMLSelectElement | null;
  if(typeFilter) typeFilter.value = 'all';
  const rangeFilter = document.getElementById('vouchers-filter-range') as HTMLSelectElement | null;
  if(rangeFilter) rangeFilter.value = 'all';
  const searchInput = document.getElementById('vouchers-search') as HTMLInputElement | null;
  if(searchInput) searchInput.value = '';

  renderVouchersTable();

  setTimeout(() => {
    const tbody = document.getElementById('vouchers-table');
    if(!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    rows.forEach(r => r.classList.remove('vouchers-row-highlighted', 'selected-row'));

    let targetRow: HTMLElement | null = null;
    rows.forEach((r: HTMLElement) => {
      if(r.innerHTML.includes(`'${sourceId}'`) || r.innerHTML.includes(`"${sourceId}"`)){
        targetRow = r;
      }
    });

    if(targetRow){
      targetRow.classList.add('vouchers-row-highlighted');
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('سند مورد نظر در لیست اسناد حسابداری انتخاب و هایلایت شد', 'success');
    } else {
      toast('به لیست اسناد حسابداری منتقل شدید');
    }
  }, 120);
}

function renderCustomerStatementContent(){
  if(!activeStatementCustomerId) return;
  const cust = db.customers.find(c => c.id === activeStatementCustomerId);
  if(!cust) return;

  const rangeEl = document.getElementById('cust-statement-range') as HTMLSelectElement | null;
  const range = rangeEl ? rangeEl.value : 'all';

  const opFilterEl = document.getElementById('cust-statement-op-filter') as HTMLSelectElement | null;
  const opFilter = opFilterEl ? opFilterEl.value : 'all';

  // Gather all historical events
  ensureDocumentIdentifiers();
  interface StatementRow {
    id: string;
    date: string;
    type: string;
    typeLabel: string;
    docNo: string;
    permanentId?: number | null;
    documentNumber?: number | null;
    invoiceNumber?: string | number | null;
    description: string;
    debitToman: number;
    creditToman: number;
    debitGold18: number;
    creditGold18: number;
    balanceToman?: number;
    balanceGold18?: number;
    sourceType: string;
    sourceId: string;
    itemsCount?: number;
    items?: Array<{
      name: string;
      barcode?: string;
      karat?: number | string;
      weight?: number;
      wagePercent?: number;
      discountPercent?: number;
      amount?: number;
    }>;
  }

  const allRows: StatementRow[] = [];

  // 1. Invoices
  (db.invoices || []).filter(i => i.customerId === cust.id).forEach(inv => {
    let typeLabel = 'فروش طلا';
    if(inv.type === 'buy') typeLabel = 'خرید از مشتری';
    else if(inv.type === 'melted') typeLabel = 'معامله آبشده';
    else if(inv.type === 'return') typeLabel = 'مرجوعی فاکتور';

    const totalAmount = inv.total || inv.finalAmount || 0;
    const goldWeight = inv.weight18 || inv.goldWeight18 || (inv.items ? inv.items.reduce((s: number, it: any) => s + (it.weight || 0), 0) : 0);

    let debitToman = 0;
    let creditToman = 0;
    let debitGold18 = 0;
    let creditGold18 = 0;

    if(inv.type === 'buy'){
      creditToman = totalAmount;
      creditGold18 = goldWeight;
    } else {
      debitToman = totalAmount;
      debitGold18 = goldWeight;
    }

    const invItems: any[] = [];
    if(inv.items && Array.isArray(inv.items) && inv.items.length > 0){
      inv.items.forEach((it: any) => {
        invItems.push({
          name: it.itemName || it.name || 'طلای ۱۸ عیار',
          barcode: it.barcode || '',
          karat: it.karat || 18,
          weight: Number(it.weight || 0),
          wagePercent: Number(it.wagePercent || 0),
          discountPercent: Number(it.discountPercent || 0),
          amount: Math.round(Number(it.amount || 0))
        });
      });
    }
    if(inv.type === 'exchange' && inv.exchangeItems && Array.isArray(inv.exchangeItems)){
      inv.exchangeItems.forEach((ex: any) => {
        invItems.push({
          name: `(مرجوعی/کهنه) ${ex.itemName || 'طلای کهنه'}`,
          barcode: '',
          karat: ex.karat || 18,
          weight: Number(ex.weight || 0),
          wagePercent: 0,
          discountPercent: 0,
          amount: Math.round(Number(ex.amount || 0))
        });
      });
    }

    let summaryDesc = inv.notes || '';
    if(invItems.length > 0){
      const itemsPreview = invItems.map(i => i.name).slice(0, 2).join('، ') + (invItems.length > 2 ? ' و...' : '');
      const notePrefix = inv.notes ? `${inv.notes} — ` : '';
      summaryDesc = `${notePrefix}${toFa(invItems.length)} قلم کالا (${itemsPreview})`;
    } else {
      summaryDesc = inv.notes || `ثبت فاکتور ${inv.type === 'buy' ? 'خرید از' : 'فروش به'} ${cust.name}`;
    }

    allRows.push({
      id: `inv-${inv.id}`,
      date: inv.date || inv.created_at || nowISO(),
      type: inv.type || 'sale',
      typeLabel,
      docNo: String(inv.documentNumber || inv.number || inv.code || inv.id.slice(0,6)),
      permanentId: inv.permanentId || null,
      documentNumber: inv.documentNumber || null,
      invoiceNumber: inv.number ? ('#' + inv.number) : null,
      description: summaryDesc,
      debitToman,
      creditToman,
      debitGold18,
      creditGold18,
      sourceType: 'invoice',
      sourceId: inv.id,
      itemsCount: invItems.length,
      items: invItems
    });
  });

  // 2. Financial Transactions (دریافت و پرداخت)
  (db.financialTransactions || []).filter(t => t.customerId === cust.id).forEach(t => {
    const isDeposit = t.kind === 'deposit' || t.type === 'receive';
    const invRef = t.invoiceId ? (db.invoices || []).find(i => i.id === t.invoiceId) : null;
    allRows.push({
      id: `txn-${t.id}`,
      date: t.date || t.created_at || nowISO(),
      type: t.kind || 'financial',
      typeLabel: isDeposit ? 'دریافت وجه' : 'پرداخت وجه',
      docNo: String(t.documentNumber || t.code || t.refNumber || t.id.slice(0,6)),
      permanentId: t.permanentId || null,
      documentNumber: t.documentNumber || null,
      invoiceNumber: invRef && invRef.number ? ('#' + invRef.number) : null,
      description: t.note || t.description || (isDeposit ? `دریافت وجه از ${cust.name}` : `پرداخت وجه به ${cust.name}`),
      debitToman: isDeposit ? 0 : (t.amount || 0),
      creditToman: isDeposit ? (t.amount || 0) : 0,
      debitGold18: 0,
      creditGold18: 0,
      sourceType: 'transaction',
      sourceId: t.id
    });
  });

  // 3. Checks
  (db.checks || []).filter(chk => chk.customerId === cust.id).forEach(chk => {
    const isReceived = chk.type === 'received';
    const invRef = chk.invoiceId ? (db.invoices || []).find(i => i.id === chk.invoiceId) : null;
    allRows.push({
      id: `chk-${chk.id}`,
      date: chk.issueDate || chk.dueDate || nowISO(),
      type: isReceived ? 'received' : 'issued',
      typeLabel: isReceived ? 'چک دریافتی' : 'چک پرداختی',
      docNo: String(chk.documentNumber || chk.number || chk.id.slice(0,6)),
      permanentId: chk.permanentId || null,
      documentNumber: chk.documentNumber || null,
      invoiceNumber: invRef && invRef.number ? ('#' + invRef.number) : null,
      description: `چک #${chk.number || chk.checkNumber || ''} ${chk.bank || chk.bankName ? 'بانک ' + (chk.bank || chk.bankName) : ''} — سررسید: ${chk.dueDate ? toDateInputValue(chk.dueDate) : '—'}`,
      debitToman: isReceived ? 0 : (chk.amount || 0),
      creditToman: isReceived ? (chk.amount || 0) : 0,
      debitGold18: 0,
      creditGold18: 0,
      sourceType: 'check',
      sourceId: chk.id
    });
  });

  // 4. Accounting Manual Documents & Journals
  (db.accountingDocs || []).forEach(doc => {
    if(doc.lines && Array.isArray(doc.lines)){
      doc.lines.forEach((ln: any, idx: number) => {
        if(ln.customerId === cust.id){
          allRows.push({
            id: `doc-${doc.id}-${idx}`,
            date: doc.date || nowISO(),
            type: 'manual_journal',
            typeLabel: 'سند حسابداری',
            docNo: String(doc.documentNumber || doc.docNumber || doc.id.slice(0,6)),
            permanentId: doc.permanentId || null,
            documentNumber: doc.documentNumber || null,
            invoiceNumber: doc.invoiceNumber || null,
            description: ln.description || doc.description || 'سند دستی حسابداری',
            debitToman: ln.debit || 0,
            creditToman: ln.credit || 0,
            debitGold18: ln.goldDebit18 || 0,
            creditGold18: ln.goldCredit18 || 0,
            sourceType: 'accounting_doc',
            sourceId: doc.id
          });
        }
      });
    }
  });

  (db.manualJournals || []).forEach(mj => {
    if(mj.customerId === cust.id){
      allRows.push({
        id: `mj-${mj.id}`,
        date: mj.date || nowISO(),
        type: 'manual',
        typeLabel: 'سند حسابداری',
        docNo: String(mj.documentNumber || mj.id.slice(0,6)),
        permanentId: mj.permanentId || null,
        documentNumber: mj.documentNumber || null,
        invoiceNumber: mj.refNumber ? (mj.refNumber.startsWith('#') ? mj.refNumber : '#' + mj.refNumber) : null,
        description: `[بد: ${mj.debitAccountName || 'حساب'} / بس: ${mj.creditAccountName || 'حساب'}] ${mj.description}`,
        debitToman: mj.amount || 0,
        creditToman: 0,
        debitGold18: mj.goldWeight || 0,
        creditGold18: 0,
        sourceType: 'manual',
        sourceId: mj.id
      });
    }
  });

  // 5. Expenses / Incomes
  (db.expensesIncomes || []).forEach(exp => {
    if(exp.personId === cust.id || exp.customerId === cust.id){
      const isExpense = exp.type === 'expense' || exp.type === 'expense_return';
      const isReturn = exp.type === 'expense_return' || exp.type === 'income_return';
      allRows.push({
        id: `exp-${exp.id}`,
        date: exp.date || exp.created_at || nowISO(),
        type: exp.type || 'expense',
        typeLabel: isExpense ? 'هزینه' : 'درآمد',
        docNo: String(exp.documentNumber || exp.code || exp.id.slice(0,6)),
        permanentId: exp.permanentId || null,
        documentNumber: exp.documentNumber || null,
        invoiceNumber: exp.trackingCode ? (exp.trackingCode.startsWith('#') ? exp.trackingCode : '#' + exp.trackingCode) : null,
        description: exp.description || exp.note || (isExpense ? `هزینه مرتبط با ${cust.name}` : `درآمد مرتبط با ${cust.name}`),
        debitToman: isExpense ? (isReturn ? 0 : exp.amount || 0) : (isReturn ? exp.amount || 0 : 0),
        creditToman: isExpense ? (isReturn ? exp.amount || 0 : 0) : (isReturn ? 0 : exp.amount || 0),
        debitGold18: 0,
        creditGold18: 0,
        sourceType: 'expense',
        sourceId: exp.id
      });
    }
  });

  // Sort by date ascending to calculate running balances
  allRows.sort((a, b) => (a.date > b.date ? 1 : -1));

  let curToman = 0;
  let curGold = 0;
  allRows.forEach(r => {
    curToman += (r.debitToman - r.creditToman);
    curGold += (r.debitGold18 - r.creditGold18);
    r.balanceToman = curToman;
    r.balanceGold18 = curGold;
  });

  // Date filtering logic
  const now = new Date();
  let filteredRows = allRows.filter(r => {
    // 1. Check Date Range
    if(range === 'today'){
      const todayStr = toDateInputValue(now);
      if(!r.date.startsWith(todayStr)) return false;
    } else if(range === 'week'){
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      if(r.date < weekAgo) return false;
    } else if(range === 'month'){
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
      if(r.date < monthAgo) return false;
    } else if(range === 'quarter'){
      const quarterAgo = new Date(now.getTime() - 90 * 86400000).toISOString();
      if(r.date < quarterAgo) return false;
    } else if(range === 'year'){
      const yearAgo = new Date(now.getTime() - 365 * 86400000).toISOString();
      if(r.date < yearAgo) return false;
    } else if(range === 'custom'){
      const fromVal = (document.getElementById('cust-statement-from') as HTMLInputElement)?.value;
      const toVal = (document.getElementById('cust-statement-to') as HTMLInputElement)?.value;
      if(fromVal && r.date < fromVal) return false;
      if(toVal && r.date > toVal + 'T23:59:59.999') return false;
    }

    // 2. Check Operation Filter
    if(opFilter && opFilter !== 'all'){
      if(opFilter === 'sales'){
        if(r.sourceType !== 'invoice' || (r.type !== 'sell' && r.type !== 'sale' && r.type !== '')) return false;
      } else if(opFilter === 'buys'){
        if(r.sourceType !== 'invoice' || r.type !== 'buy') return false;
      } else if(opFilter === 'melted'){
        if(r.sourceType !== 'invoice' || r.type !== 'melted') return false;
      } else if(opFilter === 'returns'){
        if(r.sourceType !== 'invoice' || r.type !== 'return') return false;
      } else if(opFilter === 'deposits'){
        if(r.sourceType !== 'transaction' || (r.type !== 'deposit' && r.type !== 'receive')) return false;
      } else if(opFilter === 'payments'){
        if(r.sourceType !== 'transaction' || (r.type !== 'payment' && r.type !== 'withdraw')) return false;
      } else if(opFilter === 'checks_in'){
        if(r.sourceType !== 'check' || (r.type !== 'received' && r.type !== 'check_received')) return false;
      } else if(opFilter === 'checks_out'){
        if(r.sourceType !== 'check' || (r.type !== 'issued' && r.type !== 'paid' && r.type !== 'check_issued')) return false;
      } else if(opFilter === 'gold_in'){
        if(r.debitGold18 <= 0) return false;
      } else if(opFilter === 'gold_out'){
        if(r.creditGold18 <= 0) return false;
      } else if(opFilter === 'manual_journals'){
        if(r.sourceType !== 'accounting_doc' && r.sourceType !== 'manual') return false;
      } else if(opFilter === 'expenses_incomes'){
        if(r.sourceType !== 'expense' && r.sourceType !== 'income') return false;
      }
    }

    return true;
  });

  // Calculate totals for filtered range
  const totalDebitToman = filteredRows.reduce((s, r) => s + r.debitToman, 0);
  const totalCreditToman = filteredRows.reduce((s, r) => s + r.creditToman, 0);
  const totalDebitGold = filteredRows.reduce((s, r) => s + r.debitGold18, 0);
  const totalCreditGold = filteredRows.reduce((s, r) => s + r.creditGold18, 0);
  const finalTomanBal = cust.tomanBalance || 0;
  const finalGoldBal = cust.goldBalance18 || 0;

  // Toggle column headers for gold
  const thGoldTurnover = document.getElementById('th-gold-turnover');
  const thGoldBalance = document.getElementById('th-gold-balance');
  if(thGoldTurnover) thGoldTurnover.style.display = statementShowGoldColumns ? '' : 'none';
  if(thGoldBalance) thGoldBalance.style.display = statementShowGoldColumns ? '' : 'none';

  // Render Table & Bottom Summary Bar
  const tbody = document.getElementById('cust-statement-tbody');
  const bottomBar = document.getElementById('cust-statement-bottom-bar');
  const emptyEl = document.getElementById('cust-statement-empty');
  const countEl = document.getElementById('cust-statement-count');
  if(countEl) countEl.textContent = `${toFa(filteredRows.length)} سند/رویداد (${statementViewMode === 'detailed' ? 'حالت تفصیلی اقلام' : 'حالت سرجمع'})${!statementShowGoldColumns ? ' • نمایش ریالی خالص' : ''}`;

  // Build Fixed Bottom Bar Summary HTML (کاملاً مجزا و ثابت در انتهای پنجره، با تراز چپ برای نزدیکی به ستون‌های مالی)
  if(bottomBar){
    const goldFormatted = formatGoldWithUnit(finalGoldBal);
    bottomBar.innerHTML = `
      <!-- RIGHT STATS: COUNT & INFO (در سمت راست نوار) -->
      <div style="font-size:11.5px; color:var(--text-faint); display:flex; align-items:center; gap:8px;">
        <span>📊 تعداد اسناد بازه: <strong style="color:var(--text-bright); font-size:12px;">${toFa(filteredRows.length)}</strong></span>
      </div>

      <!-- LEFT STATS: TOTALS & BALANCES (در سمت چپ نوار، دقیقا همراستا و نزدیک به ستون‌های بدهکار، بستانکار و مانده) -->
      <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-right:auto;">
        
        <!-- جمع بدهکار -->
        <div class="statement-bottom-stat">
          <span style="color:var(--text-dim); font-size:11.5px; font-weight:700;">💳 جمع بدهکار:</span>
          <span style="color:var(--gold-bright); font-size:13px; font-weight:900; font-variant-numeric:tabular-nums;">
            ${toFa(totalDebitToman)} <span style="font-size:10px; font-weight:normal; color:var(--text-faint);">ریال</span>
          </span>
        </div>

        <div class="statement-bottom-divider"></div>

        <!-- جمع بستانکار -->
        <div class="statement-bottom-stat">
          <span style="color:var(--text-dim); font-size:11.5px; font-weight:700;">💳 جمع بستانکار:</span>
          <span style="color:var(--danger); font-size:13px; font-weight:900; font-variant-numeric:tabular-nums;">
            ${toFa(totalCreditToman)} <span style="font-size:10px; font-weight:normal; color:var(--text-faint);">ریال</span>
          </span>
        </div>

        <div class="statement-bottom-divider"></div>

        <!-- مانده ریال -->
        <div class="statement-bottom-stat">
          <span style="color:var(--text-dim); font-size:11.5px; font-weight:700;">📊 مانده حساب:</span>
          <span style="font-size:13.5px; font-weight:900; font-variant-numeric:tabular-nums; ${finalTomanBal > 0 ? 'color:var(--gold-bright);' : finalTomanBal < 0 ? 'color:var(--danger);' : 'color:var(--text);'}">
            ${toFa(Math.abs(finalTomanBal))} <span style="font-size:10px; font-weight:normal; color:var(--text-faint);">ریال</span>
          </span>
          <span class="badge" style="font-size:10px; padding:1px 7px; font-weight:800; ${finalTomanBal > 0 ? 'background:rgba(201,162,39,0.18); color:var(--gold-bright);' : finalTomanBal < 0 ? 'background:rgba(239,68,68,0.18); color:var(--danger);' : ''}">
            ${finalTomanBal > 0 ? 'بدهکار' : finalTomanBal < 0 ? 'بستانکار' : 'تسویه'}
          </span>
        </div>

        ${statementShowGoldColumns ? `
          <div class="statement-bottom-divider"></div>

          <!-- مانده طلا -->
          <div class="statement-bottom-stat">
            <span style="color:var(--text-dim); font-size:11.5px; font-weight:700;">🪙 مانده طلا:</span>
            <span style="font-size:13.5px; font-weight:900; font-variant-numeric:tabular-nums; ${finalGoldBal > 0 ? 'color:var(--gold-bright);' : finalGoldBal < 0 ? 'color:var(--danger);' : 'color:var(--text);'}">
              ${goldFormatted.value} <span style="font-size:11px; font-weight:800; color:var(--gold-bright);">${goldFormatted.unit}</span>
            </span>
            <span class="badge" style="font-size:10px; padding:1px 7px; font-weight:800; ${finalGoldBal > 0 ? 'background:rgba(201,162,39,0.18); color:var(--gold-bright);' : finalGoldBal < 0 ? 'background:rgba(239,68,68,0.18); color:var(--danger);' : ''}">
              ${finalGoldBal > 0 ? 'بدهکار' : finalGoldBal < 0 ? 'بستانکار' : 'تسویه'}
            </span>
          </div>
        ` : ''}
      </div>
    `;
  }

  if(tbody){
    if(filteredRows.length === 0){
      tbody.innerHTML = '';
      if(emptyEl) emptyEl.style.display = 'block';
    } else {
      if(emptyEl) emptyEl.style.display = 'none';
      let rowCounter = 0;
      const rowsHtml: string[] = [];

      filteredRows.forEach((r) => {
        rowCounter++;
        const balToman = r.balanceToman || 0;
        const balGold = r.balanceGold18 || 0;
        const rowGoldFmt = formatGoldWithUnit(balGold);
        const isSelected = selectedStatementRow && selectedStatementRow.id === r.id;
        const hasItems = Boolean(r.items && r.items.length > 0);

        // Badge pill
        let badgeHtml = `<span class="statement-badge-pill badge-op-journal">${r.typeLabel}</span>`;
        if(r.sourceType === 'invoice'){
          if(r.type === 'buy') badgeHtml = `<span class="statement-badge-pill badge-op-buy">🏷️ خرید</span>`;
          else if(r.type === 'melted') badgeHtml = `<span class="statement-badge-pill badge-op-melt">🪙 آبشده</span>`;
          else if(r.type === 'return') badgeHtml = `<span class="statement-badge-pill badge-op-return">↩️ مرجوعی</span>`;
          else badgeHtml = `<span class="statement-badge-pill badge-op-sell">🛍️ فروش</span>`;
        } else if(r.sourceType === 'transaction'){
          if(r.type === 'deposit' || r.type === 'receive') badgeHtml = `<span class="statement-badge-pill badge-op-deposit">📥 دریافت</span>`;
          else badgeHtml = `<span class="statement-badge-pill badge-op-payment">📤 پرداخت</span>`;
        } else if(r.sourceType === 'check'){
          if(r.type === 'received') badgeHtml = `<span class="statement-badge-pill badge-op-check-in">🎫 چک دریافتی</span>`;
          else badgeHtml = `<span class="statement-badge-pill badge-op-check-out">🎫 چک پرداختی</span>`;
        } else if(r.sourceType === 'expense' || r.sourceType === 'income'){
          badgeHtml = `<span class="statement-badge-pill badge-op-expense">💸 هزینه/درآمد</span>`;
        }

        // Summary mode row or Parent row in detailed mode
        const mainRowHtml = `
          <tr class="statement-row ${isSelected ? 'statement-row-active' : ''}" 
              data-row-id="${r.id}"
              data-source-type="${r.sourceType}"
              data-source-id="${r.sourceId}"
              onclick="selectStatementRow('${r.id}', '${r.sourceType}', '${r.sourceId}', '${escapeForJs(r.docNo)}', '${escapeForJs(r.typeLabel)}')"
              ondblclick="editDocumentBySource('${r.sourceType}', '${r.sourceId}')"
              style="border-bottom:1px solid rgba(255,255,255,0.04); ${statementViewMode === 'detailed' && hasItems ? 'background:rgba(201,162,39,0.06); font-weight:700;' : ''}">
            <td style="text-align:center; color:var(--text-faint); white-space:nowrap;">${toFa(rowCounter)}</td>
            <td style="font-size:11px; font-variant-numeric:tabular-nums; direction:ltr; text-align:center;">${toFa(r.date.slice(0, 10))}</td>
            <td>${badgeHtml}</td>
            <td style="text-align:center; white-space:nowrap;"><span class="badge-doc-perm-sm" title="شماره ثابت سیستم (غیرقابل تغییر 🔒): ${toFa(r.permanentId || '—')}">${toFa(r.permanentId || '—')}</span></td>
            <td style="text-align:center; white-space:nowrap;"><span class="badge-doc-num-sm" title="شماره سند حسابداری: #${toFa(r.documentNumber || '—')}">#${toFa(r.documentNumber || '—')}</span></td>
            <td style="text-align:center; white-space:nowrap;">${r.invoiceNumber ? `<span class="badge-inv-num-sm" title="شماره فاکتور: ${toFa(r.invoiceNumber)}">${toFa(r.invoiceNumber)}</span>` : '<span style="color:var(--text-faint); font-size:10px;">—</span>'}</td>
            <td style="max-width:320px; white-space:normal; line-height:1.4;">
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span>${r.description}</span>
                ${hasItems && statementViewMode === 'summary' ? `
                  <span class="badge" style="font-size:9.5px; font-weight:700; background:rgba(201,162,39,0.15); color:var(--gold-bright); padding:1px 5px;">
                    ${toFa(r.items!.length)} قلم
                  </span>
                ` : ''}
              </div>
            </td>
            <td style="text-align:left; ${r.debitToman > 0 ? 'color:var(--gold-bright); font-weight:700;' : 'color:var(--text-faint);'}">${r.debitToman > 0 ? toFa(r.debitToman) : '—'}</td>
            <td style="text-align:left; ${r.creditToman > 0 ? 'color:var(--danger); font-weight:700;' : 'color:var(--text-faint);'}">${r.creditToman > 0 ? toFa(r.creditToman) : '—'}</td>
            <td style="text-align:left; font-weight:700; ${balToman > 0 ? 'color:var(--gold-bright);' : balToman < 0 ? 'color:var(--danger);' : ''}">
              ${toFa(Math.abs(balToman))}
              <span style="font-size:9.5px; font-weight:normal; color:var(--text-faint);">${balToman > 0 ? 'بد' : balToman < 0 ? 'بس' : 'تسویه'}</span>
            </td>
            ${statementShowGoldColumns ? `
              <td style="text-align:left; ${r.debitGold18 > 0 ? 'color:var(--gold-bright); font-weight:700;' : r.creditGold18 > 0 ? 'color:var(--danger); font-weight:700;' : 'color:var(--text-faint);'}">
                ${r.debitGold18 > 0 ? `+${toFa(r.debitGold18 < 1 ? (Math.round(r.debitGold18 * 1000) + ' سوت') : r.debitGold18.toFixed(3))}` : r.creditGold18 > 0 ? `-${toFa(r.creditGold18 < 1 ? (Math.round(r.creditGold18 * 1000) + ' سوت') : r.creditGold18.toFixed(3))}` : '—'}
              </td>
              <td style="text-align:left; font-weight:700; ${balGold > 0 ? 'color:var(--gold-bright);' : balGold < 0 ? 'color:var(--danger);' : ''}">
                ${balGold === 0 ? '۰' : `${rowGoldFmt.value} <span style="font-size:9.5px; font-weight:normal; color:var(--text-faint);">${rowGoldFmt.unit}</span>`}
              </td>
            ` : ''}
          </tr>
        `;
        rowsHtml.push(mainRowHtml);

        // If in DETAILED mode, render individual sub-rows for each invoice item directly in the table
        if(statementViewMode === 'detailed' && hasItems){
          r.items!.forEach((it, itIdx) => {
            const isBuy = r.type === 'buy';
            const itemWeight = Number(it.weight || 0);
            const itemAmount = Number(it.amount || 0);
            const itemSubRow = `
              <tr class="statement-item-subrow" style="border-bottom:1px dashed rgba(255,255,255,0.05);" onclick="selectStatementRow('${r.id}', '${r.sourceType}', '${r.sourceId}', '${escapeForJs(r.docNo)}', '${escapeForJs(r.typeLabel)}')">
                <td style="text-align:center; color:var(--text-faint); font-size:10px;">${toFa(rowCounter)}.${toFa(itIdx + 1)}</td>
                <td style="text-align:center; color:var(--text-faint); font-size:10px;">↳</td>
                <td><span style="font-size:10px; color:var(--text-faint);">قلم کالا</span></td>
                <td style="text-align:center; color:var(--text-faint); font-size:9.5px;">↳</td>
                <td style="text-align:center; color:var(--text-faint); font-size:9.5px;">—</td>
                <td style="text-align:center; font-size:9.5px; font-family:monospace; color:var(--text-faint);">${it.barcode ? toFa(it.barcode) : '—'}</td>
                <td style="padding-right:18px;">
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    <span style="color:var(--text-bright); font-weight:600;">💎 ${it.name}</span>
                    <span class="badge" style="font-size:9.5px; padding:0 4px;">عیار ${toFa(it.karat)}</span>
                    ${it.wagePercent ? `<span style="font-size:10px; color:var(--text-faint);">اجرت: ${toFa(it.wagePercent)}٪</span>` : ''}
                    ${it.discountPercent ? `<span style="font-size:10px; color:var(--danger);">تخفیف: ${toFa(it.discountPercent)}٪</span>` : ''}
                  </div>
                </td>
                <td style="text-align:left; font-size:11px; ${!isBuy && itemAmount > 0 ? 'color:var(--gold-bright);' : 'color:var(--text-faint);'}">
                  ${!isBuy && itemAmount > 0 ? toFa(itemAmount) : '—'}
                </td>
                <td style="text-align:left; font-size:11px; ${isBuy && itemAmount > 0 ? 'color:var(--danger);' : 'color:var(--text-faint);'}">
                  ${isBuy && itemAmount > 0 ? toFa(itemAmount) : '—'}
                </td>
                <td style="text-align:left; color:var(--text-faint); font-size:10px;">(زیرمجموعه)</td>
                ${statementShowGoldColumns ? `
                  <td style="text-align:left; font-size:11px; font-weight:600; ${!isBuy && itemWeight > 0 ? 'color:var(--gold-bright);' : isBuy && itemWeight > 0 ? 'color:var(--danger);' : 'color:var(--text-faint);'}">
                    ${!isBuy && itemWeight > 0 ? `+${toFa(itemWeight < 1 ? (Math.round(itemWeight * 1000) + ' سوت') : itemWeight.toFixed(3))}` : isBuy && itemWeight > 0 ? `-${toFa(itemWeight < 1 ? (Math.round(itemWeight * 1000) + ' سوت') : itemWeight.toFixed(3))}` : '—'}
                  </td>
                  <td style="text-align:left; color:var(--text-faint); font-size:10px;">(زیرمجموعه)</td>
                ` : ''}
              </tr>
            `;
            rowsHtml.push(itemSubRow);
          });
        }
      });

      tbody.innerHTML = rowsHtml.join('');
    }
  }
}

/* ============ item statement (گردش حساب و کاردکس کالا) ============ */
interface ItemStatementRow {
  id: string;
  date: string;
  type: string;
  typeLabel: string;
  typeBadge: string;
  partyName: string;
  partyId?: string;
  docNo: string;
  permanentId?: number | null;
  documentNumber?: number | null;
  invoiceNumber?: string | number | null;
  description: string;
  weightIn: number;
  weightOut: number;
  balanceWeight?: number;
  unitPrice?: number;
  amount?: number;
  sourceType: string;
  sourceId: string;
}

function getItemCategoryPath(nodeId?: string | null): string {
  const root = itemCategoryRootNode();
  if(!nodeId || (root && nodeId === root.id)){
    return root ? root.name : 'انبار و موجودی کالا';
  }
  const node = nodeById(nodeId);
  if(!node) return root ? root.name : 'انبار و موجودی کالا';
  if(node.parentId){
    const parent = nodeById(node.parentId);
    if(parent && parent.id !== root?.id){
      return `${parent.name} › ${node.name}`;
    }
  }
  return `${root ? root.name + ' › ' : ''}${node.name}`;
}

function selectItem(id: string){
  selectedItemId = (selectedItemId === id) ? null : id;
  renderInventory();
}

function openItemStatementAction(itemId?: string){
  const id = itemId || selectedItemId;
  if(!id){
    const searchEl = document.getElementById('inventory-search') as HTMLInputElement | null;
    const list = getFilteredSortedInventory(searchEl ? searchEl.value : '');
    if(list.length > 0){
      openItemStatement(list[0].id);
      return;
    } else if(db.inventory.length > 0){
      openItemStatement(db.inventory[0].id);
      return;
    } else {
      toast('هیچ کالایی در کاتالوگ انبار برای مشاهده گردش کالا ثبت نشده است');
      return;
    }
  }
  openItemStatement(id);
}

function openItemStatement(itemId: string){
  const item = db.inventory.find(i => i.id === itemId);
  if(!item){
    toast('کالای مورد نظر در انبار یافت نشد');
    return;
  }
  activeStatementItemId = itemId;
  selectedItemId = itemId;
  selectedItemStatementRow = null;

  const overlay = document.getElementById('item-statement-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  syncModalOpenState();

  const sel = document.getElementById('item-statement-select') as HTMLSelectElement | null;
  if(sel){
    sel.innerHTML = db.inventory.map(i => `
      <option value="${i.id}" ${i.id === itemId ? 'selected' : ''}>${escapeHtml(i.name)} (${toFa(i.code || '')}${i.karat ? ` - عیار ${toFa(i.karat)}` : ''})</option>
    `).join('');
  }

  const pathEl = document.getElementById('item-statement-path');
  if(pathEl){
    pathEl.innerHTML = `<span style="color:var(--gold-bright);">📍 ${getItemCategoryPath(item.parentNodeId)}</span>`;
  }

  const titleEl = document.getElementById('item-statement-title');
  if(titleEl){
    titleEl.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2 3 7l9 5 9-5-9-5z"/><path d="M3 7v10l9 5 9-5V7"/><path d="M12 12v10"/></svg>
      گردش حساب و کاردکس کالا: <span style="color:#fff;">${escapeHtml(item.name)}</span>
    `;
  }

  const badgeWrap = document.getElementById('item-statement-badge-wrap');
  if(badgeWrap){
    let bHtml = '';
    if(item.code) bHtml += `<span class="badge" style="font-size:11px; font-weight:normal;">کد: ${toFa(item.code)}</span>`;
    if(item.karat) bHtml += `<span class="badge" style="font-size:11px; font-weight:normal;">عیار ${toFa(item.karat)}</span>`;
    if(item.wage) bHtml += `<span class="badge" style="font-size:11px; font-weight:normal;">اجرت: ${toFa(item.wage)}٪</span>`;
    if(item.barcode) bHtml += `<span class="badge" style="font-size:11px; font-weight:normal;">🏷️ ${escapeHtml(item.barcode)}</span>`;
    if(item.taxExempt) bHtml += `<span class="badge badge-synced" style="font-size:10.5px;">معاف مالیات</span>`;
    badgeWrap.innerHTML = bHtml;
  }

  updateItemStatementSelectedRowUI();
  renderItemStatementContent();
}

function closeItemStatement(){
  const overlay = document.getElementById('item-statement-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  selectedItemStatementRow = null;
  syncModalOpenState();
}

function printItemStatement(){
  window.print();
}

function onItemStatementRangeChange(){
  const rangeEl = document.getElementById('item-statement-range') as HTMLSelectElement | null;
  const customDatesWrap = document.getElementById('item-statement-custom-dates');
  const range = rangeEl ? rangeEl.value : 'all';

  if(range === 'custom'){
    if(customDatesWrap) customDatesWrap.style.display = 'flex';
    const fromInput = document.getElementById('item-statement-from') as HTMLInputElement | null;
    const toInput = document.getElementById('item-statement-to') as HTMLInputElement | null;
    if(fromInput && !fromInput.value){
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      fromInput.value = toDateInputValue(thirtyDaysAgo);
    }
    if(toInput && !toInput.value){
      toInput.value = toDateInputValue(new Date());
    }
  } else {
    if(customDatesWrap) customDatesWrap.style.display = 'none';
  }

  renderItemStatementContent();
}

function resetItemStatementFilters(){
  const opFilterEl = document.getElementById('item-statement-op-filter') as HTMLSelectElement | null;
  if(opFilterEl) opFilterEl.value = 'all';

  const rangeEl = document.getElementById('item-statement-range') as HTMLSelectElement | null;
  if(rangeEl) rangeEl.value = 'all';

  const customDatesWrap = document.getElementById('item-statement-custom-dates');
  if(customDatesWrap) customDatesWrap.style.display = 'none';

  const fromInput = document.getElementById('item-statement-from') as HTMLInputElement | null;
  if(fromInput) fromInput.value = '';

  const toInput = document.getElementById('item-statement-to') as HTMLInputElement | null;
  if(toInput) toInput.value = '';

  selectedItemStatementRow = null;
  updateItemStatementSelectedRowUI();
  renderItemStatementContent();
  toast('فیلترها و بازه زمانی کاردکس کالا به حالت اولیه بازنشانی شدند');
}

function toggleItemStatementValues(){
  itemStatementShowValues = !itemStatementShowValues;
  const btn = document.getElementById('btn-item-statement-toggle-values');
  const txt = document.getElementById('item-statement-values-text');
  if(btn && txt){
    if(itemStatementShowValues){
      btn.classList.remove('toggle-off');
      txt.textContent = 'ستون ارزش ریالی: روشن';
    } else {
      btn.classList.add('toggle-off');
      txt.textContent = 'ستون ارزش ریالی: خاموش';
    }
  }
  document.querySelectorAll('.item-statement-val-col').forEach((el: any) => {
    el.style.display = itemStatementShowValues ? '' : 'none';
  });
}

function selectItemStatementRow(rowId: string, sourceType: string, sourceId: string, docNo: string, typeLabel: string){
  selectedItemStatementRow = { id: rowId, sourceType, sourceId, docNo, typeLabel };
  
  const tbody = document.getElementById('item-statement-tbody');
  if(tbody){
    tbody.querySelectorAll('tr').forEach(tr => {
      if(tr.getAttribute('data-row-id') === rowId){
        tr.classList.add('statement-row-active');
      } else {
        tr.classList.remove('statement-row-active');
      }
    });
  }

  updateItemStatementSelectedRowUI();
}

function updateItemStatementSelectedRowUI(){
  const infoEl = document.getElementById('item-statement-selected-info');
  const btnEdit = document.getElementById('btn-item-statement-edit-voucher') as HTMLButtonElement | null;
  const btnView = document.getElementById('btn-item-statement-view-vouchers') as HTMLButtonElement | null;
  const btnDouble = document.getElementById('btn-item-statement-view-double') as HTMLButtonElement | null;

  if(selectedItemStatementRow){
    if(infoEl){
      infoEl.innerHTML = `
        <span style="display:inline-flex; align-items:center; gap:4px; color:var(--gold-bright); font-weight:700;">
          <span style="width:6px; height:6px; border-radius:50%; background:var(--gold-bright);"></span>
          سند انتخابی: ${selectedItemStatementRow.typeLabel} (#${toFa(selectedItemStatementRow.docNo)})
        </span>
      `;
    }
    if(btnEdit){
      btnEdit.classList.add('active-accent');
      btnEdit.disabled = false;
    }
    if(btnView){
      btnView.disabled = false;
    }
    if(btnDouble){
      btnDouble.disabled = false;
    }
  } else {
    if(infoEl){
      infoEl.innerHTML = `<span style="color:var(--text-faint);">سندی انتخاب نشده</span>`;
    }
    if(btnEdit){
      btnEdit.classList.remove('active-accent');
      btnEdit.disabled = false;
    }
    if(btnView){
      btnView.disabled = false;
    }
    if(btnDouble){
      btnDouble.disabled = false;
    }
  }
}

function editSelectedItemStatementDocument(){
  if(selectedItemStatementRow && selectedItemStatementRow.sourceId && selectedItemStatementRow.sourceType){
    closeItemStatement();
    editDocumentBySource(selectedItemStatementRow.sourceType, selectedItemStatementRow.sourceId);
    return;
  }
  const firstRow = document.querySelector('#item-statement-tbody tr') as HTMLElement | null;
  if(firstRow && firstRow.getAttribute('data-source-id') && firstRow.getAttribute('data-source-type')){
    closeItemStatement();
    editDocumentBySource(firstRow.getAttribute('data-source-type')!, firstRow.getAttribute('data-source-id')!);
    return;
  }
  toast('لطفاً ابتدا یک سند را از جدول کاردکس انتخاب کنید');
}

function viewSelectedItemStatementDocInVouchers(){
  if(selectedItemStatementRow && selectedItemStatementRow.sourceId && selectedItemStatementRow.sourceType){
    closeItemStatement();
    viewStatementDocInVouchers(selectedItemStatementRow.sourceType, selectedItemStatementRow.sourceId);
    return;
  }
  const firstRow = document.querySelector('#item-statement-tbody tr') as HTMLElement | null;
  if(firstRow && firstRow.getAttribute('data-source-id') && firstRow.getAttribute('data-source-type')){
    closeItemStatement();
    viewStatementDocInVouchers(firstRow.getAttribute('data-source-type')!, firstRow.getAttribute('data-source-id')!);
    return;
  }
  toast('لطفاً ابتدا یک سند را از جدول کاردکس انتخاب کنید');
}

function viewSelectedItemStatementDoubleEntry(){
  if(selectedItemStatementRow && selectedItemStatementRow.sourceId && selectedItemStatementRow.sourceType){
    openVoucherDetailModal(selectedItemStatementRow.sourceId, selectedItemStatementRow.sourceType);
    return;
  }
  const firstRow = document.querySelector('#item-statement-tbody tr') as HTMLElement | null;
  if(firstRow && firstRow.getAttribute('data-source-id') && firstRow.getAttribute('data-source-type')){
    openVoucherDetailModal(firstRow.getAttribute('data-source-id')!, firstRow.getAttribute('data-source-type')!);
    return;
  }
  toast('لطفاً ابتدا یک سند را از جدول کاردکس انتخاب کنید');
}

function renderItemStatementContent(){
  if(!activeStatementItemId) return;
  const item = db.inventory.find(i => i.id === activeStatementItemId);
  if(!item) return;

  ensureDocumentIdentifiers();

  const allRows: ItemStatementRow[] = [];
  const targetId = item.id;
  const targetName = (item.name || '').trim().toLowerCase();
  const targetBarcode = (item.barcode || '').trim().toLowerCase();

  // 1. Scan Invoices
  (db.invoices || []).forEach(inv => {
    const party = (db.customers || []).find(c => c.id === inv.customerId);
    const partyName = party ? party.name : (inv.customerName || 'مشتری متفرقه');

    // Line items
    (inv.items || []).forEach((it: any, itIdx: number) => {
      const itId = it.itemId;
      const itName = (it.itemName || '').trim().toLowerCase();
      const itBarcode = (it.barcode || '').trim().toLowerCase();

      const isMatch = (itId && itId === targetId) ||
                      (targetBarcode && itBarcode && itBarcode === targetBarcode) ||
                      (targetName && itName && itName === targetName);

      if(isMatch){
        const weight = Number(it.weight || 0);
        let weightIn = 0;
        let weightOut = 0;
        let typeKey = inv.type || 'sell';
        let typeBadge = '';
        let typeLabel = '';

        if(inv.type === 'buy'){
          weightIn = weight;
          typeLabel = 'خرید کالا (وارده)';
          typeBadge = '<span class="statement-badge-pill badge-op-buy"><span class="badge-dot"></span>🏷️ خرید (وارده)</span>';
        } else if(inv.type === 'return'){
          weightIn = weight;
          typeLabel = 'مرجوعی فروش (وارده)';
          typeBadge = '<span class="statement-badge-pill badge-op-check"><span class="badge-dot"></span>↩️ مرجوعی انبار</span>';
        } else if(inv.type === 'exchange'){
          weightOut = weight;
          typeLabel = 'تعویض (خروج کالای نو)';
          typeBadge = '<span class="statement-badge-pill badge-op-gold"><span class="badge-dot"></span>🔄 تعویض (خروج)</span>';
        } else if(inv.type === 'melted'){
          weightOut = weight;
          typeLabel = 'معامله آبشده';
          typeBadge = '<span class="statement-badge-pill badge-op-gold"><span class="badge-dot"></span>🪙 آبشده</span>';
        } else {
          weightOut = weight;
          typeLabel = 'فروش کالا (صادره)';
          typeBadge = '<span class="statement-badge-pill badge-op-sell"><span class="badge-dot"></span>🛍️ فروش (صادره)</span>';
        }

        const price18 = Number(it.price18 || inv.price18 || db.settings.price18 || 0);
        const amount = Number(it.amount || Math.round(weight * price18));

        const specsParts: string[] = [];
        if(it.karat) specsParts.push(`عیار ${toFa(it.karat)}`);
        if(it.wagePercent) specsParts.push(`اجرت ${toFa(it.wagePercent)}٪`);
        if(it.discountPercent) specsParts.push(`تخفیف ${toFa(it.discountPercent)}٪`);
        if(it.barcode) specsParts.push(`بارکد: ${it.barcode}`);
        const specsText = specsParts.join(' • ');

        let desc = it.itemName || item.name;
        if(specsText) desc += ` (${specsText})`;
        if(inv.notes) desc += ` — ${inv.notes}`;

        allRows.push({
          id: `inv-it-${inv.id}-${itIdx}`,
          date: inv.date || inv.created_at || nowISO(),
          type: typeKey,
          typeLabel,
          typeBadge,
          partyName,
          partyId: inv.customerId,
          docNo: String(inv.documentNumber || inv.number || '—'),
          permanentId: inv.permanentId,
          documentNumber: inv.documentNumber,
          invoiceNumber: inv.number,
          description: desc,
          weightIn,
          weightOut,
          unitPrice: price18,
          amount,
          sourceType: 'invoice',
          sourceId: inv.id
        });
      }
    });

    // Exchange items
    (inv.exchangeItems || []).forEach((ex: any, exIdx: number) => {
      const exName = (ex.itemName || '').trim().toLowerCase();
      const isMatch = (targetName && exName && (exName === targetName || (targetName.includes('کهنه') && exName.includes('کهنه'))));
      if(isMatch){
        const weight = Number(ex.weight || 0);
        const price18 = Number(ex.price18 || inv.price18 || db.settings.price18 || 0);
        const amount = Number(ex.amount || Math.round(weight * price18));

        allRows.push({
          id: `inv-ex-${inv.id}-${exIdx}`,
          date: inv.date || inv.created_at || nowISO(),
          type: 'exchange',
          typeLabel: 'دریافت کهنه (وارده)',
          typeBadge: '<span class="statement-badge-pill badge-op-gold"><span class="badge-dot"></span>🔄 طلای کهنه (ورود)</span>',
          partyName,
          partyId: inv.customerId,
          docNo: String(inv.documentNumber || inv.number || '—'),
          permanentId: inv.permanentId,
          documentNumber: inv.documentNumber,
          invoiceNumber: inv.number,
          description: ex.itemName ? `${ex.itemName} (دریافت در تعویض)` : 'طلای کهنه دریافتی تعویض',
          weightIn: weight,
          weightOut: 0,
          unitPrice: price18,
          amount,
          sourceType: 'invoice',
          sourceId: inv.id
        });
      }
    });
  });

  // 2. Scan Manual Journals / Accounting Docs
  (db.manualJournals || []).forEach((mj: any) => {
    const isMatch = (mj.itemId && mj.itemId === targetId) ||
                    (mj.description && targetName && mj.description.toLowerCase().includes(targetName)) ||
                    (mj.description && item.code && mj.description.includes(String(item.code)));
    if(isMatch){
      const weight = Number(mj.goldWeight || 0);
      const isDebit = mj.type === 'debit' || mj.direction === 'in';
      allRows.push({
        id: `mj-${mj.id}`,
        date: mj.date || nowISO(),
        type: 'manual',
        typeLabel: 'سند حسابداری دستی',
        typeBadge: '<span class="statement-badge-pill badge-op-journal"><span class="badge-dot"></span>⚖️ سند انبار</span>',
        partyName: mj.customerName || 'دفاتر انبار',
        docNo: String(mj.documentNumber || mj.number || '—'),
        permanentId: mj.permanentId,
        documentNumber: mj.documentNumber,
        invoiceNumber: null,
        description: mj.description || 'ثبت دستی تعدیل انبار / موجودی کالا',
        weightIn: isDebit ? weight : 0,
        weightOut: isDebit ? 0 : weight,
        unitPrice: Number(mj.price18 || db.settings.price18 || 0),
        amount: Number(mj.amount || 0),
        sourceType: 'manual',
        sourceId: mj.id
      });
    }
  });

  // Sort chronologically ascending
  allRows.sort((a, b) => {
    const da = a.date || '';
    const dbDate = b.date || '';
    if(da !== dbDate) return da > dbDate ? 1 : -1;
    return (a.documentNumber || 0) - (b.documentNumber || 0);
  });

  // Compute Running Inventory Stock Balance
  let runningStock = 0;
  allRows.forEach(r => {
    runningStock += (r.weightIn - r.weightOut);
    r.balanceWeight = runningStock;
  });

  // Filtering
  const opFilterEl = document.getElementById('item-statement-op-filter') as HTMLSelectElement | null;
  const opFilter = opFilterEl ? opFilterEl.value : 'all';

  const rangeEl = document.getElementById('item-statement-range') as HTMLSelectElement | null;
  const range = rangeEl ? rangeEl.value : 'all';

  let fromDate = '';
  let toDate = '';
  const now = new Date();

  if(range === 'today'){
    fromDate = toDateInputValue(now);
    toDate = toDateInputValue(now);
  } else if(range === 'week'){
    fromDate = toDateInputValue(new Date(now.getTime() - 7 * 86400000));
    toDate = toDateInputValue(now);
  } else if(range === 'month'){
    fromDate = toDateInputValue(new Date(now.getTime() - 30 * 86400000));
    toDate = toDateInputValue(now);
  } else if(range === 'quarter'){
    fromDate = toDateInputValue(new Date(now.getTime() - 90 * 86400000));
    toDate = toDateInputValue(now);
  } else if(range === 'year'){
    fromDate = toDateInputValue(new Date(now.getFullYear(), 0, 1));
    toDate = toDateInputValue(now);
  } else if(range === 'custom'){
    const fromInput = document.getElementById('item-statement-from') as HTMLInputElement | null;
    const toInput = document.getElementById('item-statement-to') as HTMLInputElement | null;
    fromDate = fromInput ? fromInput.value : '';
    toDate = toInput ? toInput.value : '';
  }

  const filteredRows = allRows.filter(r => {
    if(opFilter === 'sales'){
      if(r.type !== 'sell' && !(r.weightOut > 0 && r.type !== 'return')) return false;
    } else if(opFilter === 'buys'){
      if(r.type !== 'buy' && !(r.weightIn > 0 && r.type !== 'return' && r.type !== 'exchange')) return false;
    } else if(opFilter === 'exchanges'){
      if(r.type !== 'exchange') return false;
    } else if(opFilter === 'returns'){
      if(r.type !== 'return') return false;
    } else if(opFilter === 'melted'){
      if(r.type !== 'melted') return false;
    } else if(opFilter === 'manual'){
      if(r.type !== 'manual') return false;
    }

    const rowDateStr = (r.date || '').slice(0, 10);
    if(fromDate && rowDateStr < fromDate) return false;
    if(toDate && rowDateStr > toDate) return false;

    return true;
  });

  const totalWeightIn = filteredRows.reduce((sum, r) => sum + (r.weightIn || 0), 0);
  const totalWeightOut = filteredRows.reduce((sum, r) => sum + (r.weightOut || 0), 0);
  const totalValue = filteredRows.reduce((sum, r) => sum + (r.amount || 0), 0);
  const currentStock = runningStock;

  const tbody = document.getElementById('item-statement-tbody');
  const countEl = document.getElementById('item-statement-count');
  const emptyEl = document.getElementById('item-statement-empty');

  if(countEl) countEl.textContent = `${toFa(filteredRows.length)} گردش ثبت‌شده`;

  if(emptyEl){
    emptyEl.style.display = filteredRows.length === 0 ? 'block' : 'none';
  }

  if(tbody){
    tbody.innerHTML = '';
    filteredRows.forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'statement-row';
      tr.setAttribute('data-row-id', r.id);
      tr.setAttribute('data-source-id', r.sourceId);
      tr.setAttribute('data-source-type', r.sourceType);

      if(selectedItemStatementRow && selectedItemStatementRow.id === r.id){
        tr.classList.add('statement-row-active');
      }

      tr.onclick = () => selectItemStatementRow(r.id, r.sourceType, r.sourceId, r.docNo, r.typeLabel);
      tr.ondblclick = () => editDocumentBySource(r.sourceType, r.sourceId);

      const balWeightFmt = formatGoldWithUnit(r.balanceWeight || 0);
      const inWeightFmt = r.weightIn > 0 ? formatGoldWithUnit(r.weightIn) : null;
      const outWeightFmt = r.weightOut > 0 ? formatGoldWithUnit(r.weightOut) : null;

      const balColor = (r.balanceWeight || 0) > 0.0001 ? 'color:#10b981;' : ((r.balanceWeight || 0) < -0.0001 ? 'color:#ef4444;' : 'color:var(--text-faint);');

      tr.innerHTML = `
        <td style="text-align:center; font-size:11px; color:var(--text-faint);">${toFa(idx + 1)}</td>
        <td style="text-align:center; font-size:11.5px; white-space:nowrap;">${toFaDate(r.date)}</td>
        <td>${r.typeBadge}</td>
        <td>
          <div style="font-weight:700; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;" title="${escapeHtml(r.partyName)}">
            ${escapeHtml(r.partyName)}
          </div>
        </td>
        <td style="text-align:center;">
          ${r.permanentId ? `<span class="badge" style="font-size:10.5px; font-weight:700; background:rgba(217,119,6,0.12); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); padding:1px 5px; border-radius:4px;" title="شماره ثبت غیرقابل تغییر 🔒">${toFa(r.permanentId)}</span>` : '<span style="color:var(--text-faint);">—</span>'}
        </td>
        <td style="text-align:center; font-size:11px; font-weight:700; color:var(--gold-bright);">
          ${r.documentNumber ? '#' + toFa(r.documentNumber) : '—'}
        </td>
        <td style="text-align:center; font-size:11px; font-weight:700; color:var(--text-dim);">
          ${r.invoiceNumber ? '#' + toFa(r.invoiceNumber) : '—'}
        </td>
        <td style="font-size:11.5px; color:var(--text); max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(r.description)}">
          ${escapeHtml(r.description)}
        </td>
        <td style="text-align:left; font-size:11.5px; font-weight:700; color:#10b981; direction:ltr;">
          ${inWeightFmt ? `${inWeightFmt.value} <span style="font-size:10px; font-weight:normal; color:#10b981;">${inWeightFmt.unit}</span>` : '—'}
        </td>
        <td style="text-align:left; font-size:11.5px; font-weight:700; color:#ef4444; direction:ltr;">
          ${outWeightFmt ? `${outWeightFmt.value} <span style="font-size:10px; font-weight:normal; color:#ef4444;">${outWeightFmt.unit}</span>` : '—'}
        </td>
        <td style="text-align:left; font-size:12px; font-weight:800; ${balColor} direction:ltr;">
          ${balWeightFmt.value} <span style="font-size:10px; font-weight:normal;">${balWeightFmt.unit}</span>
        </td>
        <td class="item-statement-val-col" style="text-align:left; font-size:11px; color:var(--text-dim); direction:ltr; ${itemStatementShowValues ? '' : 'display:none;'}">
          ${r.unitPrice ? fmtMoney(r.unitPrice) : '—'}
        </td>
        <td class="item-statement-val-col" style="text-align:left; font-size:11.5px; font-weight:700; color:var(--gold-bright); direction:ltr; ${itemStatementShowValues ? '' : 'display:none;'}">
          ${r.amount ? fmtMoney(r.amount) : '—'}
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Bottom Summary Bar
  const bottomBar = document.getElementById('item-statement-bottom-bar');
  if(bottomBar){
    const inFmt = formatGoldWithUnit(totalWeightIn);
    const outFmt = formatGoldWithUnit(totalWeightOut);
    const stockFmt = formatGoldWithUnit(currentStock);

    let stockBadge = '';
    if(currentStock > 0.0001){
      stockBadge = '<span class="badge badge-synced" style="margin-right:6px;"><span class="dot"></span>موجود در انبار</span>';
    } else if(currentStock < -0.0001){
      stockBadge = '<span class="badge badge-pending" style="margin-right:6px;"><span class="dot"></span>کسری موجودی</span>';
    } else {
      stockBadge = '<span class="badge" style="margin-right:6px; background:rgba(255,255,255,0.06);">اتمام موجودی</span>';
    }

    bottomBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="statement-bottom-stat">
          <span style="font-size:11px; color:var(--text-faint);">تعداد اسناد بازه:</span>
          <span style="font-size:13px; font-weight:800; color:#fff;">${toFa(filteredRows.length)}</span>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
        <div class="statement-bottom-stat">
          <span style="font-size:11px; color:var(--text-faint);">جمع وارده (ورود به انبار):</span>
          <span style="font-size:13px; font-weight:800; color:#10b981; direction:ltr;">${inFmt.value} ${inFmt.unit}</span>
        </div>

        <div class="statement-bottom-divider"></div>

        <div class="statement-bottom-stat">
          <span style="font-size:11px; color:var(--text-faint);">جمع صادره (خروج از انبار):</span>
          <span style="font-size:13px; font-weight:800; color:#ef4444; direction:ltr;">${outFmt.value} ${outFmt.unit}</span>
        </div>

        <div class="statement-bottom-divider"></div>

        <div class="statement-bottom-stat">
          <span style="font-size:11px; color:var(--text-faint);">موجودی لحظه‌ای کالا:</span>
          <span style="font-size:13.5px; font-weight:900; color:var(--gold-bright); direction:ltr;">${stockFmt.value} ${stockFmt.unit}</span>
          ${stockBadge}
        </div>

        <div class="statement-bottom-divider"></div>

        <div class="statement-bottom-stat">
          <span style="font-size:11px; color:var(--text-faint);">ارزش ریالی مبادلات:</span>
          <span style="font-size:13px; font-weight:800; color:#fbbf24; direction:ltr;">${fmtMoney(totalValue)} <span style="font-size:10px; font-weight:normal; color:var(--text-faint);">ریال</span></span>
        </div>
      </div>
    `;
  }
}

function openCustomerLedgerInfoAction(customerId?: string){
  const id = customerId || selectedCustomerId;
  if(!id){
    const list = getFilteredSortedCustomers('', customersActiveBranch);
    if(list.length > 0){
      openCustomerLedgerInfo(list[0].id);
    } else if(db.customers.length > 0){
      openCustomerLedgerInfo(db.customers[0].id);
    } else {
      toast('هنوز شخصی برای مشاهده اطلاعات دفتر ثبت نشده است');
    }
    return;
  }
  openCustomerLedgerInfo(id);
}

function openCustomerLedgerInfo(customerId: string){
  const cust = db.customers.find(c => c.id === customerId);
  if(!cust){
    toast('شخص مورد نظر یافت نشد');
    return;
  }
  activeLedgerCustomerId = customerId;
  selectedCustomerId = customerId;

  const overlay = document.getElementById('customer-ledger-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  syncModalOpenState();

  const root = customerBranchRootNode(cust.branch || 'main');
  const parentNode = cust.parentNodeId ? db.coaNodes.find(n => n.id === cust.parentNodeId) : root;
  const fullPath = getCustomerCategoryPath(cust.parentNodeId, cust.branch);

  const sameCategoryCustomers = (db.customers || []).filter(c => (c.branch || 'main') === (cust.branch || 'main') && ((!cust.parentNodeId && (!c.parentNodeId || c.parentNodeId === root?.id)) || c.parentNodeId === cust.parentNodeId));
  const totalCategoryToman = sameCategoryCustomers.reduce((acc, c) => acc + (c.tomanBalance || 0), 0);
  const totalCategoryGold = sameCategoryCustomers.reduce((acc, c) => acc + (c.goldBalance18 || 0), 0);

  const body = document.getElementById('cust-ledger-modal-body');
  if(!body) return;

  body.innerHTML = `
    <!-- PERSON IDENTITY & BRANCH CARD -->
    <div style="background:var(--elev); border:1px solid var(--border); border-radius:12px; padding:18px 20px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:10px;">
        <div>
          <div style="font-size:16px; font-weight:800; color:var(--text-bright);">${cust.name}</div>
          <div style="font-size:12px; color:var(--text-dim); margin-top:2px;">
            ${cust.job ? cust.job + ' • ' : ''}${cust.personType === 'legal' ? '🏢 شخص حقوقی' : '👤 شخص حقیقی'} • تفصیلی یکتا در ساختار حسابداری
          </div>
        </div>
        <div style="display:flex; gap:6px;">
          <span class="badge" style="background:rgba(217,119,6,0.15); color:var(--gold-bright); font-size:11.5px; font-weight:700;">
            ${cust.branch === 'staff' ? '👔 حساب پرسنل' : cust.branch === 'other' ? '🤝 سایر اشخاص' : '👥 اشخاص و طرف‌حساب‌ها'}
          </span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
        <div style="background:var(--panel); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-faint);">مانده ریالی شخص</div>
          <div style="font-size:14px; font-weight:800; margin-top:4px; ${cust.tomanBalance > 0 ? 'color:var(--gold-bright);' : cust.tomanBalance < 0 ? 'color:var(--danger);' : ''}">
            ${toFa(Math.abs(cust.tomanBalance || 0))} ریال
            <span style="font-size:10.5px; font-weight:normal;">(${cust.tomanBalance > 0 ? 'بدهکار' : cust.tomanBalance < 0 ? 'بستانکار' : 'تسویه'})</span>
          </div>
        </div>

        <div style="background:var(--panel); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-faint);">مانده طلای ۱۸ عیار شخص</div>
          <div style="font-size:14px; font-weight:800; margin-top:4px; ${cust.goldBalance18 > 0 ? 'color:var(--gold-bright);' : cust.goldBalance18 < 0 ? 'color:var(--danger);' : ''}">
            ${toFa((cust.goldBalance18 || 0).toFixed ? (cust.goldBalance18 || 0).toFixed(3) : cust.goldBalance18)} گرم
            <span style="font-size:10.5px; font-weight:normal;">(${cust.goldBalance18 > 0 ? 'بدهکار' : cust.goldBalance18 < 0 ? 'بستانکار' : 'تسویه'})</span>
          </div>
        </div>
      </div>
    </div>

    <!-- CHART OF ACCOUNTS POSITION & HIERARCHY -->
    <div style="background:var(--elev); border:1px solid var(--border); border-radius:12px; padding:18px 20px;">
      <div style="font-size:13px; font-weight:800; color:var(--gold-bright); margin-bottom:14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
        <span>📍 موقعیت و جایگاه سرفصل در ساختار دفاتر (Chart of Accounts)</span>
      </div>

      <div style="background:var(--panel); border:1px solid var(--border); border-radius:8px; padding:12px 16px; margin-bottom:14px;">
        <div style="font-size:11px; color:var(--text-faint); margin-bottom:4px;">مسیر سلسله‌مراتب دفاتر کل، معین و تفصیلی:</div>
        <div style="font-size:13.5px; font-weight:800; color:var(--text-bright); line-height:1.6;">
          🏢 حسابداری مرکزی › 🏛️ ترازنامه › 📈 دارایی‌های جاری › 💰 حساب‌های دریافتنی تجاری › ${fullPath} › 👤 <b>${cust.name}</b>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
        <div style="background:var(--panel); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-faint);">دسته مستقیم در دفتر معین</div>
          <div style="font-size:13px; font-weight:800; color:var(--gold-bright); margin-top:4px;">
            📂 ${parentNode?.name || root?.name || 'اشخاص'}
          </div>
        </div>

        <div style="background:var(--panel); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-faint);">کدینگ اختصاصی در دفاتر</div>
          <div style="font-size:13px; font-weight:800; color:var(--text-bright); margin-top:4px; font-variant-numeric:tabular-nums; direction:ltr;">
            ${parentNode?.code || root?.code || '1.01.02'}.${cust.id.slice(0, 4)}
          </div>
        </div>
      </div>
    </div>

    <!-- CATEGORY SUMMARY STATS -->
    <div style="background:var(--elev); border:1px solid var(--border); border-radius:12px; padding:18px 20px;">
      <div style="font-size:13px; font-weight:800; color:var(--gold-bright); margin-bottom:14px; display:flex; align-items:center; gap:8px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:8px;">
        <span>📊 آمار کلی دسته «${parentNode?.name || root?.name || 'اشخاص'}» در دفاتر</span>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
        <div style="background:var(--panel); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-faint);">تعداد کل اعضای این دسته</div>
          <div style="font-size:15px; font-weight:800; color:var(--text-bright); margin-top:4px;">${toFa(sameCategoryCustomers.length)} شخص</div>
        </div>

        <div style="background:var(--panel); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-faint);">مجموع مانده ریالی دسته</div>
          <div style="font-size:14px; font-weight:800; color:var(--gold-bright); margin-top:4px;">${toFa(totalCategoryToman)} ریال</div>
        </div>

        <div style="background:var(--panel); padding:10px 14px; border-radius:8px; border:1px solid var(--border);">
          <div style="font-size:11px; color:var(--text-faint);">مجموع طلای دسته (۱۸)</div>
          <div style="font-size:14px; font-weight:800; color:var(--gold-bright); margin-top:4px;">${toFa(totalCategoryGold.toFixed ? totalCategoryGold.toFixed(3) : totalCategoryGold)} گرم</div>
        </div>
      </div>
    </div>

    <!-- ACTION BUTTONS -->
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding-top:4px;">
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button class="btn btn-sm" style="font-size:12px; font-weight:700; padding:8px 16px;" onclick="closeCustomerLedgerInfo(); openCustomerStatement('${cust.id}')">
          📊 مشاهده ریز گردش حساب
        </button>
        <button class="btn btn-sm" style="font-size:12px; font-weight:700; padding:8px 16px;" onclick="closeCustomerLedgerInfo(); openCustomerForm('${cust.id}')">
          ✏️ ویرایش مشخصات شخص
        </button>
      </div>

      <button class="btn btn-gold btn-sm" style="font-size:12px; font-weight:800; padding:8px 18px;" onclick="changeCustomerCategoryFromLedger('${cust.id}')">
        ⇄ تغییر دسته شخص در دفاتر
      </button>
    </div>
  `;
}

function closeCustomerLedgerInfo(){
  const overlay = document.getElementById('customer-ledger-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  syncModalOpenState();
}

function changeCustomerCategoryFromLedger(customerId: string){
  closeCustomerLedgerInfo();
  openCustomerForm(customerId);
  openCategoryPickerFromCustomerForm();
}

function customerRowHtml(c, actionHtml?: string){
  const branchBadge = c.branch === 'staff'
    ? '<span class="cust-pill-tag cust-pill-purple">👔 پرسنل</span>'
    : c.branch === 'other'
    ? '<span class="cust-pill-tag cust-pill-blue">🤝 سایر</span>'
    : '<span class="cust-pill-tag cust-pill-gold">👥 اشخاص</span>';

  const root = customerBranchRootNode(c.branch || 'main');
  const catNode = c.parentNodeId ? db.coaNodes.find(n => n.id === c.parentNodeId) : null;
  const hasSpecificCat = catNode && (!root || catNode.id !== root.id);
  const catDisplay = hasSpecificCat
    ? `<div style="font-weight:600; color:var(--text); display:flex; align-items:center; gap:5px;"><span style="color:var(--gold-bright); font-size:11px;">●</span><span>${catNode.name}</span></div>`
    : `<div style="color:var(--text-faint); display:flex; align-items:center; gap:5px;"><span style="font-size:11px; opacity:0.4;">●</span><span>(پیش‌فرض)</span></div>`;

  const legalBadge = c.personType === 'legal' ? '<span class="cust-pill-tag cust-pill-green" style="margin-right:4px;">حقوقی</span>' : '';
  const jobText = c.job ? `<span style="font-size:11px; color:var(--text-dim); font-weight:normal; margin-right:4px;">(${c.job})</span>` : '';
  const phoneDisplay = c.phone ? `<span style="font-size:11px; color:var(--text-faint); font-variant-numeric:tabular-nums; direction:ltr; display:inline-block; margin-right:8px;">${toFa(c.phone)}</span>` : '';

  const gBal = c.goldBalance18 || 0;
  let goldStatusBadge = '<span class="cust-bal-status-zero">تسویه</span>';
  let goldColor = 'color:var(--text-dim);';
  if(gBal > 0.0001){
    goldStatusBadge = '<span class="cust-bal-status-badge cust-bal-status-gold">بدهکار</span>';
    goldColor = 'color:var(--gold-bright);';
  } else if(gBal < -0.0001){
    goldStatusBadge = '<span class="cust-bal-status-badge cust-bal-status-red">بستانکار</span>';
    goldColor = 'color:var(--danger);';
  }

  const tBal = c.tomanBalance || 0;
  let tomanStatusBadge = '<span class="cust-bal-status-zero">تسویه</span>';
  let tomanColor = 'color:var(--text-dim);';
  if(tBal > 0){
    tomanStatusBadge = '<span class="cust-bal-status-badge cust-bal-status-gold">بدهکار</span>';
    tomanColor = 'color:var(--gold-bright);';
  } else if(tBal < 0){
    tomanStatusBadge = '<span class="cust-bal-status-badge cust-bal-status-red">بستانکار</span>';
    tomanColor = 'color:var(--danger);';
  }

  return `
    <td style="text-align:center; width:85px;">
      <span class="cust-code-badge">${toFa(c.code || '1001')}</span>
    </td>
    <td style="text-align:right;">
      <div class="cust-row-name-box">
        <div class="cust-row-title-line">
          <span class="cust-row-name-text">${escapeHtml(c.name)}</span>
          ${jobText}
          ${legalBadge}
        </div>
        ${phoneDisplay ? `<div class="cust-row-meta">${phoneDisplay}</div>` : ''}
      </div>
    </td>
    <td style="text-align:center; width:105px;">${branchBadge}</td>
    <td style="text-align:left; width:160px;">
      <div class="cust-bal-cell">
        <span class="cust-bal-num" style="${goldColor}">${toFa(Math.abs(gBal).toFixed(3))}<span class="cust-bal-unit"> گرم</span></span>
        ${goldStatusBadge}
      </div>
    </td>
    <td style="text-align:left; width:170px;">
      <div class="cust-bal-cell">
        <span class="cust-bal-num" style="${tomanColor}">${toFa(fmtMoney(Math.abs(tBal)))}<span class="cust-bal-unit"> ریال</span></span>
        ${tomanStatusBadge}
      </div>
    </td>
    <td style="text-align:center; width:85px;">${actionHtml ? actionHtml : syncBadge(c.is_synced)}</td>
  `;
}

function getFilteredSortedCustomers(searchValue, branch){
  let list = filterCustomers(searchValue);
  if(branch){ list = list.filter(c => (c.branch || 'main') === branch); }
  return applySort(list, customersSort);
}

const savedTableColumnWidths: Record<string, number[]> = {};
let resizeJustFinished = false;

function makeTableResizable(table: HTMLTableElement | null, tableKeyId?: string){
  if(!table) return;
  const thead = table.querySelector('thead');
  if(!thead) return;
  const thList = Array.from(thead.querySelectorAll<HTMLTableCellElement>('th'));
  if(!thList.length) return;

  const tableKey = tableKeyId || table.id || (table.closest('.view')?.id ? table.closest('.view')!.id + '_tbl' : 'tbl_' + (thList.length));

  // If widths are saved, apply them immediately
  if(savedTableColumnWidths[tableKey] && savedTableColumnWidths[tableKey].length === thList.length){
    let totalW = 0;
    thList.forEach((th, idx) => {
      const w = savedTableColumnWidths[tableKey][idx];
      if(w){
        th.style.width = w + 'px';
        th.style.minWidth = w + 'px';
        th.style.maxWidth = w + 'px';
        totalW += w;
      }
    });
    if(totalW > 0){
      table.style.width = totalW + 'px';
    }
  } else {
    // Save initial computed widths
    const widths: number[] = [];
    let totalW = 0;
    thList.forEach((th) => {
      const w = th.offsetWidth || 120;
      th.style.width = w + 'px';
      th.style.minWidth = w + 'px';
      th.style.maxWidth = w + 'px';
      widths.push(w);
      totalW += w;
    });
    if(totalW > 0){
      table.style.width = totalW + 'px';
    }
    savedTableColumnWidths[tableKey] = widths;
  }

  thList.forEach((th, colIdx) => {
    let resizer = th.querySelector<HTMLDivElement>('.col-resizer');
    if(!resizer){
      resizer = document.createElement('div');
      resizer.className = 'col-resizer';
      resizer.title = 'برای تغییر خودکار اندازه ۲ بار کلیک کنید یا با کشیدن تنظیم کنید';
      th.appendChild(resizer);
    }

    resizer.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
    };

    resizer.ondblclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      resizeJustFinished = true;
      setTimeout(() => { resizeJustFinished = false; }, 300);

      // Excel-like Auto-Fit: calculate max width of all cells in this column (header + all tbody rows)
      let maxWidth = 45;

      // 1. Measure header text width
      const headerSpan = document.createElement('span');
      headerSpan.style.visibility = 'hidden';
      headerSpan.style.position = 'fixed';
      headerSpan.style.whiteSpace = 'nowrap';
      headerSpan.style.font = window.getComputedStyle(th).font;
      headerSpan.innerText = (th.textContent || '').replace('▲', '').replace('▼', '').trim();
      document.body.appendChild(headerSpan);
      maxWidth = Math.max(maxWidth, headerSpan.getBoundingClientRect().width + 36);
      document.body.removeChild(headerSpan);

      // 2. Measure every row cell in tbody for this column (td at position colIdx)
      const rows = Array.from(table.querySelectorAll('tbody tr'));
      rows.forEach(tr => {
        const td = tr.children[colIdx] as HTMLElement;
        if (!td) return;

        // Measure text content
        const measureSpan = document.createElement('span');
        measureSpan.style.visibility = 'hidden';
        measureSpan.style.position = 'fixed';
        measureSpan.style.whiteSpace = 'nowrap';
        measureSpan.style.font = window.getComputedStyle(td).font;
        measureSpan.innerText = (td.textContent || '').trim();
        document.body.appendChild(measureSpan);
        let cellW = measureSpan.getBoundingClientRect().width + 28;
        document.body.removeChild(measureSpan);

        // Check if there are buttons, badges or custom inner elements
        const subButtons = td.querySelectorAll('button, .badge, a, input, select');
        if (subButtons.length > 0) {
          let buttonsW = 0;
          subButtons.forEach(b => { buttonsW += ((b as HTMLElement).offsetWidth || 50) + 8; });
          cellW = Math.max(cellW, buttonsW + 28);
        }

        maxWidth = Math.max(maxWidth, cellW);
      });

      const autoWidth = Math.ceil(Math.max(50, Math.min(850, maxWidth)));
      th.style.width = autoWidth + 'px';
      th.style.minWidth = autoWidth + 'px';
      th.style.maxWidth = autoWidth + 'px';

      if(!savedTableColumnWidths[tableKey]){
        savedTableColumnWidths[tableKey] = [];
      }
      savedTableColumnWidths[tableKey][colIdx] = autoWidth;

      let sum = 0;
      thList.forEach((h, i) => {
        sum += (savedTableColumnWidths[tableKey][i] || h.offsetWidth || 100);
      });
      table.style.width = sum + 'px';
    };

    resizer.onmousedown = (e) => {
      e.stopPropagation();
      e.preventDefault();

      const startX = e.clientX;
      const startWidth = th.offsetWidth;
      let hasMoved = false;
      resizer!.classList.add('resizing');
      document.body.classList.add('resizing-active');

      const onMouseMove = (moveEvent: MouseEvent) => {
        // In RTL layout, moving mouse left increases column width
        const diff = startX - moveEvent.clientX;
        if(Math.abs(diff) > 2) hasMoved = true;
        const newWidth = Math.max(45, startWidth + diff);
        th.style.width = newWidth + 'px';
        th.style.minWidth = newWidth + 'px';
        th.style.maxWidth = newWidth + 'px';

        if(!savedTableColumnWidths[tableKey]){
          savedTableColumnWidths[tableKey] = [];
        }
        savedTableColumnWidths[tableKey][colIdx] = newWidth;

        let sum = 0;
        thList.forEach((h, i) => {
          sum += (savedTableColumnWidths[tableKey][i] || h.offsetWidth || 100);
        });
        table.style.width = sum + 'px';
      };

      const onMouseUp = () => {
        resizer!.classList.remove('resizing');
        document.body.classList.remove('resizing-active');
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if(hasMoved){
          resizeJustFinished = true;
          setTimeout(() => {
            resizeJustFinished = false;
          }, 300);
        }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
  });
}

function initAllTableResizers(){
  document.querySelectorAll<HTMLTableElement>('table').forEach(tbl => {
    makeTableResizable(tbl);
  });
}

function renderCustomers(){
  renderCustomerBadges();
  const thead = document.getElementById('customers-thead');
  if(thead) thead.innerHTML = customersHeaderHtml();
  const tbody = document.getElementById('customers-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  const searchEl = document.getElementById('customers-search') as HTMLInputElement | null;
  const list = getFilteredSortedCustomers(searchEl ? searchEl.value : '', customersActiveBranch);
  const emptyEl = document.getElementById('customers-empty');
  if(emptyEl){
    emptyEl.style.display = list.length ? 'none' : 'block';
    emptyEl.textContent = (db.customers.length && !list.length) ? 'موردی با این مشخصات یافت نشد' : 'هنوز شخصی ثبت نشده';
  }
  list.forEach(c => {
    const isSelected = selectedCustomerId === c.id;
    const tr = document.createElement('tr');
    tr.className = isSelected ? 'selected-row' : '';
    tr.style.cursor = 'pointer';
    tr.onclick = () => selectCustomer(c.id);
    tr.ondblclick = () => openCustomerForm(c.id);

    tr.innerHTML = customerRowHtml(c);
    tbody.appendChild(tr);
  });

  const tbl = document.querySelector<HTMLTableElement>('#view-customers table');
  if(tbl) makeTableResizable(tbl, 'customers-main-table');
}

/* ============ inventory ============ */
let editingItemId = null;
let pendingItemPhoto = null;

function nextBarcode(){
  let max = 0;
  db.inventory.forEach(i => {
    const m = /^[A-Za-z](\d{5})$/.exec(String(i.barcode || '').trim());
    if(m){
      const n = parseInt(m[1], 10);
      if(n > max) max = n;
    }
  });
  return 'A' + String(max + 1).padStart(5, '0');
}
function isValidBarcode(bc){
  return /^[A-Za-z]\d{5}$/.test(String(bc || '').trim());
}

function onItemPhotoChange(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const img = new Image();
    img.onload = function(){
      let w = img.width, h = img.height;
      const maxSize = 300;
      if(w > maxSize || h > maxSize){
        if(w > h){ h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      pendingItemPhoto = canvas.toDataURL('image/jpeg', 0.75);
      showItemPhotoPreview(pendingItemPhoto);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function showItemPhotoPreview(dataUrl){
  const preview = document.getElementById('item-photo-preview');
  const clearBtn = document.getElementById('item-photo-clear');
  if(preview && clearBtn){
    if(dataUrl){
      preview.src = dataUrl; preview.style.display = 'block'; clearBtn.style.display = 'inline';
    } else {
      preview.src = ''; preview.style.display = 'none'; clearBtn.style.display = 'none';
    }
  }
}
function clearItemPhoto(){
  pendingItemPhoto = null;
  const inp = document.getElementById('item-photo-input');
  if(inp) inp.value = '';
  showItemPhotoPreview(null);
}

function itemCategoryRootNode(){ return coaNodeByCode('1.01.04.01'); }
function itemTreePositionLabel(i){
  if(!i.parentNodeId) return 'در دفاتر ثبت نشده';
  const node = nodeById(i.parentNodeId);
  return node ? `در دفاتر: ${node.name}` : 'در دفاتر ثبت شده';
}

function flattenCategoryOptions(rootNode: any, depth = 1): Array<{ id: string; label: string }> {
  if(!rootNode) return [];
  const results: Array<{ id: string; label: string }> = [];
  const children = nodeChildren(rootNode);
  children.forEach(child => {
    const indent = depth > 1 ? '— '.repeat(depth - 1) : '';
    results.push({
      id: child.id,
      label: `${indent}📂 ${child.name}${child.code ? ' (' + child.code + ')' : ''}`
    });
    const subChildren = flattenCategoryOptions(child, depth + 1);
    results.push(...subChildren);
  });
  return results;
}

function populateItemCategorySelect(){
  const root = itemCategoryRootNode();
  const sel = document.getElementById('item-category');
  if(!sel || !root) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">بدون دسته — مستقیم زیر «${root.name}»</option>` +
    flattenCategoryOptions(root).map(o => `<option value="${o.id}">${o.label}</option>`).join('');
  sel.value = current;
}

function openItemForm(id){
  editingItemId = id || null;
  const overlay = document.getElementById('item-form-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  const saveBtn = document.getElementById('item-save-btn');
  const delBtn = document.getElementById('item-modal-delete-btn');
  const posEl = document.getElementById('item-tree-position');
  const titleEl = document.getElementById('item-form-title');
  pendingItemPhoto = null;
  const photoInp = document.getElementById('item-photo-input');
  if(photoInp) photoInp.value = '';
  populateItemCategorySelect();

  if(editingItemId){
    if(delBtn) delBtn.style.display = 'inline-flex';
    const i = db.inventory.find(x => x.id === editingItemId);
    if(i){
      if(titleEl) titleEl.textContent = `💍 ویرایش کالا: ${i.name}`;
      const codeEl = document.getElementById('item-code') as HTMLInputElement | null;
      if(codeEl) codeEl.value = i.code || nextItemCode();
      document.getElementById('item-name').value = i.name;
      document.getElementById('item-karat').value = i.karat;
      document.getElementById('item-wage').value = i.wage;
      document.getElementById('item-barcode').value = i.barcode || '';
      document.getElementById('item-desc').value = i.description || '';
      document.getElementById('item-tax-exempt').checked = !!i.taxExempt;
      document.getElementById('item-category').value = i.parentNodeId || '';
      if(posEl) posEl.textContent = itemTreePositionLabel(i);
      pendingItemPhoto = i.photo || null;
      showItemPhotoPreview(i.photo || null);
    }
    if(saveBtn) saveBtn.textContent = 'بروزرسانی کالا';
  } else {
    if(delBtn) delBtn.style.display = 'none';
    if(titleEl) titleEl.textContent = '💍 ثبت کالای جدید در کاردکس';
    ['item-code','item-name','item-wage','item-desc'].forEach(fid => {
      const el = document.getElementById(fid);
      if(el) el.value = '';
    });
    const codeEl = document.getElementById('item-code') as HTMLInputElement | null;
    if(codeEl){
      codeEl.value = nextItemCode();
      codeEl.readOnly = true;
    }
    document.getElementById('item-tax-exempt').checked = false;
    document.getElementById('item-barcode').value = nextBarcode();
    const root = itemCategoryRootNode();
    if(posEl) posEl.textContent = root ? `پیش‌فرض زیر «${root.name}»` : '—';
    showItemPhotoPreview(null);
    if(saveBtn) saveBtn.textContent = 'ذخیره کالا';
  }
  setTimeout(() => {
    const inp = document.getElementById('item-name');
    if(inp) inp.focus();
  }, 50);
}

function closeItemForm(){
  const overlay = document.getElementById('item-form-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  const delBtn = document.getElementById('item-modal-delete-btn');
  if(delBtn) delBtn.style.display = 'none';
  ['item-code','item-name','item-wage','item-barcode','item-desc'].forEach(fid => {
    const el = document.getElementById(fid);
    if(el) el.value = '';
  });
  document.getElementById('item-tax-exempt').checked = false;
  clearItemPhoto();
  editingItemId = null;
}

function editSelectedItemAction(itemId?: string){
  const id = itemId || selectedItemId;
  if(!id){
    const searchEl = document.getElementById('inventory-search') as HTMLInputElement | null;
    const list = getFilteredSortedInventory(searchEl ? searchEl.value : '');
    if(list.length > 0){
      openItemForm(list[0].id);
    } else if(db.inventory.length > 0){
      openItemForm(db.inventory[0].id);
    } else {
      toast('ابتدا یک کالا را از جدول انتخاب نمایید یا روی دکمه «کالای جدید» کلیک کنید');
    }
    return;
  }
  openItemForm(id);
}

function deleteItemAction(itemId?: string, event?: Event){
  if(event) event.stopPropagation();
  const id = itemId || selectedItemId;
  if(!id){
    const searchEl = document.getElementById('inventory-search') as HTMLInputElement | null;
    const list = getFilteredSortedInventory(searchEl ? searchEl.value : '');
    if(list.length === 1){
      performItemDelete(list[0]);
    } else {
      toast('لطفاً ابتدا روی ردیف کالای مورد نظر در جدول کلیک کنید تا انتخاب شود', 'error');
    }
    return;
  }
  const item = db.inventory.find(i => i.id === id);
  if(!item){
    toast('کالای مورد نظر یافت نشد', 'error');
    return;
  }
  performItemDelete(item);
}

function performItemDelete(item: any){
  const itemId = item.id;
  const linkedInvoices = (db.invoices || []).filter(inv => {
    const hasSell = (inv.sellLines || []).some(l => l.itemId === itemId);
    const hasBuy = (inv.buyLines || []).some(l => l.itemId === itemId);
    const hasExSell = (inv.exchangeSellLines || []).some(l => l.itemId === itemId);
    const hasExBuy = (inv.exchangeBuyLines || []).some(l => l.itemId === itemId);
    return hasSell || hasBuy || hasExSell || hasExBuy;
  });

  let msg = `آیا از حذف کالای «${item.name}» از کاردکس اطمینان دارید؟`;
  if(linkedInvoices.length > 0){
    msg = `⚠️ هشدار حسابداری:\nکالای «${item.name}» در ${toFa(linkedInvoices.length)} فاکتور گردش داشته است.\nآیا از حذف این کالا از لیست انبار اطمینان دارید؟`;
  }

  showConfirmModal({
    title: `حذف کالا: ${item.name}`,
    message: msg,
    confirmText: 'بله، حذف شود',
    cancelText: 'انصراف',
    isDanger: true,
    onConfirm: () => {
      db.inventory = db.inventory.filter(i => i.id !== itemId);
      persist('inventory');
      addLog(`کالا حذف شد: ${item.name}`);
      toast(`کالای «${item.name}» با موفقیت حذف شد`, 'success');
      if(selectedItemId === itemId) selectedItemId = null;
      if(activeStatementItemId === itemId){
        activeStatementItemId = null;
        closeItemStatement();
      }
      renderInventory();
      renderAccountTree();
    }
  });
}

function deleteItemFromModal(){
  if(!editingItemId) return;
  const targetId = editingItemId;
  const item = db.inventory.find(i => i.id === targetId);
  if(!item) return;
  closeItemForm();
  performItemDelete(item);
}

function saveItem(){
  const codeInput = document.getElementById('item-code') as HTMLInputElement | null;
  let code = toEn(codeInput ? codeInput.value.trim() : '');
  if(!code) code = nextItemCode();

  const name = document.getElementById('item-name').value.trim();
  const karat = Number(document.getElementById('item-karat').value);
  const wage = Number(toEn(document.getElementById('item-wage').value || 0));
  const barcode = document.getElementById('item-barcode').value.trim();
  const description = document.getElementById('item-desc').value.trim();
  const taxExempt = document.getElementById('item-tax-exempt').checked;
  const categoryId = document.getElementById('item-category').value || null;

  if(!name){ toast('نام کالا را وارد کنید', 'error'); return; }
  if(!isValidBarcode(barcode)){ toast('بارکد باید با یک حرف انگلیسی و ۵ رقم باشد (مثلاً A00001)', 'error'); return; }

  const dupCode = db.inventory.find(i => i.id !== editingItemId && toEn(String(i.code || '')).trim() === code);
  if(dupCode){ toast(`⚠️ کد حساب «${code}» قبلاً برای کالای «${dupCode.name}» استفاده شده است`, 'error'); return; }

  const dupName = db.inventory.find(i => i.id !== editingItemId && i.name.trim().toLowerCase() === name.toLowerCase());
  if(dupName){ toast('کالایی با این نام قبلاً ثبت شده است', 'error'); return; }
  const dupBarcode = db.inventory.find(i => i.id !== editingItemId && String(i.barcode || '').trim().toLowerCase() === barcode.toLowerCase());
  if(dupBarcode){ toast('این بارکد قبلاً ثبت شده است', 'error'); return; }

  if(editingItemId){
    const i = db.inventory.find(x => x.id === editingItemId);
    if(i){
      i.code = code; i.name = name; i.karat = karat; i.wage = wage; i.barcode = barcode; i.description = description;
      i.taxExempt = taxExempt; i.photo = pendingItemPhoto; i.parentNodeId = categoryId;
      i.updated_at = nowISO(); i.is_synced = false;
      addLog(`کالا ویرایش شد: ${name}`);
      toast('کالا بروزرسانی شد', 'success');
    }
  } else {
    const root = itemCategoryRootNode();
    const newItem = {
      id: uuid(),
      code,
      name, karat, wage, barcode, description, taxExempt,
      photo: pendingItemPhoto,
      parentNodeId: categoryId || (root ? root.id : null),
      updated_at: nowISO(),
      is_synced: false
    };
    db.inventory.push(newItem);
    addLog(`کالای جدید به انبار اضافه شد: ${name}`);
    toast('کالا ذخیره شد', 'success');
  }
  persist('inventory');
  closeItemForm();
  renderInventory();
}

let inventoryActiveCategoryFilter: string | null = null;
(window as any).inventoryActiveCategoryFilter = null;

function populateInventoryCategoryFilterSelect(){
  const selectEl = document.getElementById('inventory-filter-category') as HTMLSelectElement | null;
  if(!selectEl) return;
  const root = itemCategoryRootNode();
  const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
  const totalCount = (db.inventory || []).length;
  const unassignedCount = (db.inventory || []).filter(i => !i.parentNodeId || i.parentNodeId === root?.id).length;

  let optionsHtml = `<option value="all">همه گروه‌ها (${toFa(totalCount)})</option>`;
  categories.forEach(cat => {
    const count = (db.inventory || []).filter(i => i.parentNodeId === cat.id).length;
    optionsHtml += `<option value="${cat.id}">${escapeHtml(cat.name)} (${toFa(count)})</option>`;
  });
  if(unassignedCount > 0 && categories.length > 0){
    optionsHtml += `<option value="__unassigned__">بدون گروه / پیش‌فرض (${toFa(unassignedCount)})</option>`;
  }
  selectEl.innerHTML = optionsHtml;
  selectEl.value = inventoryActiveCategoryFilter || 'all';
}

function onInventoryCategoryFilterChange(val: string){
  const catId = (val === 'all' || !val) ? null : val;
  filterInventoryByCategory(catId);
}

function filterInventoryByCategory(catId: string | null){
  inventoryActiveCategoryFilter = catId;
  const selectEl = document.getElementById('inventory-filter-category') as HTMLSelectElement | null;
  if(selectEl) selectEl.value = catId || 'all';
  renderInventory();
}

function promptAddItemCategory(){
  const root = itemCategoryRootNode();
  if(!root){
    toast('سرفصل ریشه کالا یافت نشد', 'error');
    return;
  }
  const name = prompt('نام گروه جدید کالا را وارد کنید:');
  if(!name || !name.trim()) return;
  const newCat = {
    id: uuid(),
    code: nextCoaNodeCode(root.id),
    name: name.trim(),
    parentId: root.id,
    type: 'asset' as const,
    nature: 'debit' as const,
    isLeaf: true,
    isSystem: false,
    systemTag: 'inventory_category'
  };
  db.coaNodes.push(newCat);
  persist('coaNodes');
  toast(`گروه «${name.trim()}» ایجاد شد`, 'success');
  renderInventory();
}

function renderInventoryCategorySidebar(){
  const sidebarCatEl = document.getElementById('inventory-sidebar-categories');
  if(!sidebarCatEl) return;
  const root = itemCategoryRootNode();
  const categories = root ? db.coaNodes.filter(n => n.parentId === root.id) : [];
  const totalCount = (db.inventory || []).length;
  const unassignedCount = (db.inventory || []).filter(i => !i.parentNodeId || i.parentNodeId === root?.id).length;

  if(categories.length === 0){
    sidebarCatEl.innerHTML = `
      <button class="cust-cat-item-btn active" onclick="filterInventoryByCategory(null)">
        <span>همه کالاها</span>
        <span class="cust-cat-count">${toFa(totalCount)}</span>
      </button>
      <div style="padding:16px 8px; font-size:11px; color:var(--text-faint); text-align:center; line-height:1.6;">
        هنوز گروهی تعریف نشده است.<br>از دکمه «+ گروه جدید» برای ایجاد دسته‌بندی کالا استفاده کنید.
      </div>
    `;
  } else {
    let html = `
      <button class="cust-cat-item-btn ${!inventoryActiveCategoryFilter ? 'active' : ''}" onclick="filterInventoryByCategory(null)">
        <span>همه کالاها</span>
        <span class="cust-cat-count">${toFa(totalCount)}</span>
      </button>
    `;
    categories.forEach(cat => {
      const count = (db.inventory || []).filter(i => i.parentNodeId === cat.id).length;
      const isAct = inventoryActiveCategoryFilter === cat.id;
      html += `
        <button class="cust-cat-item-btn ${isAct ? 'active' : ''}" onclick="filterInventoryByCategory('${cat.id}')">
          <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;" title="${cat.name}">${cat.name}</span>
          <span class="cust-cat-count">${toFa(count)}</span>
        </button>
      `;
    });
    if(unassignedCount > 0 && categories.length > 0){
      const isUnassigned = inventoryActiveCategoryFilter === '__unassigned__';
      html += `
        <button class="cust-cat-item-btn ${isUnassigned ? 'active' : ''}" style="color:#fbbf24;" onclick="filterInventoryByCategory('__unassigned__')">
          <span>بدون گروه (پیش‌فرض)</span>
          <span class="cust-cat-count" style="background:rgba(251,191,36,0.15); color:#fbbf24;">${toFa(unassignedCount)}</span>
        </button>
      `;
    }
    sidebarCatEl.innerHTML = html;
  }
}

function filterInventory(query){
  const q = toEn(String(query || '')).trim().toLowerCase();
  let list = db.inventory || [];
  if(!q) return list;
  return list.filter(i =>
    String(i.code || '').toLowerCase().includes(q) ||
    toEn(String(i.code || '')).toLowerCase().includes(q) ||
    i.name.toLowerCase().includes(q) ||
    String(i.barcode || '').toLowerCase().includes(q) ||
    String(i.description || '').toLowerCase().includes(q) ||
    String(i.karat).includes(q)
  );
}

let inventoryColumns = { karat: true, wage: true, barcode: false, description: false, tax: true, status: true };
try {
  const saved = JSON.parse(localStorage.getItem('gold_inventory_columns') || 'null');
  if(saved) inventoryColumns = Object.assign(inventoryColumns, saved);
} catch(e){}

function toggleColumnsPanel(event){
  if(event) event.stopPropagation();
  const panel = document.getElementById('inventory-columns-panel');
  if(panel) panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}
document.addEventListener('click', function(e){
  const panel = document.getElementById('inventory-columns-panel');
  if(!panel || panel.style.display !== 'block') return;
  if(!panel.contains(e.target) && e.target.id !== 'inventory-columns-panel'){
    panel.style.display = 'none';
  }
});
function toggleColumn(col, checked){
  inventoryColumns[col] = checked;
  localStorage.setItem('gold_inventory_columns', JSON.stringify(inventoryColumns));
  renderInventory();
}

let inventorySort = { field: null, dir: 0 };
function sortInventoryBy(field){
  if(resizeJustFinished) return;
  if(inventorySort.field !== field){
    inventorySort = { field, dir: 1 };
  } else {
    inventorySort.dir = (inventorySort.dir + 1) % 3;
    if(inventorySort.dir === 0) inventorySort.field = null;
  }
  renderInventory();
  if(document.getElementById('kardex-modal-overlay')?.style.display === 'flex'){
    renderKardexModalList();
  }
}

function updateInventoryKpis(){
  const list = db.inventory || [];
  const totalCount = list.length;
  const barcodedCount = list.filter(i => !!i.barcode).length;
  const taxExemptCount = list.filter(i => !!i.taxExempt).length;
  const avgWage = totalCount > 0 ? (list.reduce((acc, i) => acc + (Number(i.wage) || 0), 0) / totalCount).toFixed(1) : '۰';

  const countEl = document.getElementById('kpi-inv-count');
  if(countEl) countEl.textContent = toFa(totalCount);

  const barcodeEl = document.getElementById('kpi-inv-barcode');
  if(barcodeEl) barcodeEl.textContent = toFa(barcodedCount);

  const taxEl = document.getElementById('kpi-inv-tax');
  if(taxEl) taxEl.textContent = toFa(taxExemptCount);

  const wageEl = document.getElementById('kpi-inv-wage');
  if(wageEl) wageEl.textContent = `${toFa(avgWage)}٪`;
}

function inventoryHeaderHtml(){
  const arrow = (field) => inventorySort.field === field ? (inventorySort.dir === 1 ? '▲' : inventorySort.dir === 2 ? '▼' : '') : '';
  let h = '<tr><th style="width:48px; text-align:center;"></th><th style="width:85px; text-align:center;" class="sortable-th" onclick="sortInventoryBy(\'code\')">کد حساب<span class="sort-indicator">' + arrow('code') + '</span></th><th class="sortable-th" style="text-align:right;" onclick="sortInventoryBy(\'name\')">نام کالا<span class="sort-indicator">' + arrow('name') + '</span></th>';
  if(inventoryColumns.karat) h += '<th class="sortable-th" style="width:85px; text-align:center;" onclick="sortInventoryBy(\'karat\')">عیار<span class="sort-indicator">' + arrow('karat') + '</span></th>';
  if(inventoryColumns.wage) h += '<th class="sortable-th" style="width:90px; text-align:center;" onclick="sortInventoryBy(\'wage\')">اجرت<span class="sort-indicator">' + arrow('wage') + '</span></th>';
  if(inventoryColumns.barcode) h += '<th class="sortable-th" style="width:110px; text-align:center;" onclick="sortInventoryBy(\'barcode\')">بارکد<span class="sort-indicator">' + arrow('barcode') + '</span></th>';
  if(inventoryColumns.description) h += '<th class="sortable-th" style="text-align:right;" onclick="sortInventoryBy(\'description\')">مشخصات<span class="sort-indicator">' + arrow('description') + '</span></th>';
  if(inventoryColumns.tax) h += '<th class="sortable-th" style="width:100px; text-align:center;" onclick="sortInventoryBy(\'taxExempt\')">مالیات<span class="sort-indicator">' + arrow('taxExempt') + '</span></th>';
  if(inventoryColumns.status) h += '<th class="sortable-th" style="width:85px; text-align:center;" onclick="sortInventoryBy(\'is_synced\')">وضعیت<span class="sort-indicator">' + arrow('is_synced') + '</span></th>';
  h += '<th style="width:130px; text-align:center;">عملیات</th></tr>';
  return h;
}

function inventoryRowHtml(i, actionHtml){
  let row = `<td style="text-align:center; width:48px;">${i.photo ? `<img src="${i.photo}" style="width:34px; height:34px; object-fit:cover; border-radius:6px; border:1px solid var(--border);">` : `<div style="width:34px; height:34px; border-radius:6px; border:1px dashed var(--border); display:flex; align-items:center; justify-content:center; color:var(--text-faint); font-size:12px; background:var(--elev);">💍</div>`}</td>
    <td style="text-align:center; width:85px;">
      <span class="cust-code-badge">${toFa(i.code || '2001')}</span>
    </td>
    <td style="text-align:right;">
      <div style="font-weight:700; color:var(--text);">${escapeHtml(i.name)}</div>
      ${(i.barcode && !inventoryColumns.barcode) ? `<div style="color:var(--text-faint); font-size:11px; margin-top:2px;">بارکد: <span style="direction:ltr; display:inline-block; font-variant-numeric:tabular-nums;">${i.barcode}</span></div>` : ''}
    </td>`;
  if(inventoryColumns.karat) row += `<td style="text-align:center; width:85px;"><span style="background:rgba(251,191,36,0.1); color:var(--gold-bright); border:1px solid rgba(251,191,36,0.25); border-radius:4px; padding:2px 8px; font-size:11px; font-weight:700;">عیار ${toFa(i.karat)}</span></td>`;
  if(inventoryColumns.wage) row += `<td style="text-align:center; width:90px; font-weight:700; color:#38bdf8; font-variant-numeric:tabular-nums;">${toFa(i.wage)}٪</td>`;
  if(inventoryColumns.barcode) row += `<td style="text-align:center; width:110px; color:var(--text-dim); font-size:11.5px; direction:ltr; font-variant-numeric:tabular-nums;">${i.barcode || '—'}</td>`;
  if(inventoryColumns.description) row += `<td style="text-align:right; color:var(--text-dim); font-size:11.5px;">${escapeHtml(i.description || '—')}</td>`;
  if(inventoryColumns.tax) row += `<td style="text-align:center; width:100px;">${i.taxExempt ? `<span class="badge badge-synced"><span class="dot"></span>معاف</span>` : `<span class="badge badge-pending"><span class="dot"></span>۱۰٪ ماده ۲۶</span>`}</td>`;
  if(inventoryColumns.status) row += `<td style="text-align:center; width:85px;">${syncBadge(i.is_synced)}</td>`;
  row += `<td style="text-align:center; width:130px;">${actionHtml}</td>`;
  return row;
}

function getFilteredSortedInventory(searchValue){
  return applySort(filterInventory(searchValue), inventorySort);
}

function renderInventory(){
  updateInventoryKpis();
  ['karat','wage','barcode','description','tax','status'].forEach(col => {
    const el = document.getElementById('col-' + col);
    if(el) el.checked = !!inventoryColumns[col];
  });
  const thead = document.getElementById('inventory-thead');
  if(thead) thead.innerHTML = inventoryHeaderHtml();
  const tbody = document.getElementById('inventory-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  const searchEl = document.getElementById('inventory-search') as HTMLInputElement | null;
  const list = getFilteredSortedInventory(searchEl ? searchEl.value : '');
  const emptyEl = document.getElementById('inventory-empty');
  if(emptyEl){
    emptyEl.style.display = list.length ? 'none' : 'block';
    emptyEl.textContent = (db.inventory.length && !list.length) ? 'موردی یافت نشد' : 'هنوز کالایی ثبت نشده';
  }
  list.forEach(i => {
    const isSelected = selectedItemId === i.id;
    const tr = document.createElement('tr');
    if(isSelected) tr.classList.add('selected-row');
    tr.style.cursor = 'pointer';
    tr.onclick = () => selectItem(i.id);
    tr.ondblclick = () => openItemForm(i.id);
    const actionHtml = `
      <div style="display:inline-flex; gap:4px; align-items:center;">
        <button class="btn btn-sm btn-modern-ghost" style="padding:2px 8px; font-size:11px; font-weight:700; color:var(--gold-bright);" onclick="event.stopPropagation(); openItemStatement('${i.id}')" title="مشاهده کاردکس و گردش کالا">📊 گردش</button>
        <button class="btn btn-sm" style="padding:2px 8px; font-size:11px;" onclick="event.stopPropagation(); openItemForm('${i.id}')">ویرایش</button>
      </div>`;
    tr.innerHTML = inventoryRowHtml(i, actionHtml);
    tbody.appendChild(tr);
  });

  const tbl = document.querySelector<HTMLTableElement>('#view-inventory table');
  if(tbl) makeTableResizable(tbl, 'inventory-main-table');
}

/* ============ settings ============ */
function renderSettings(){
  document.getElementById('set-price18').value = fmtMoneyInput(db.settings.price18);
  document.getElementById('set-profit').value = db.settings.profit;
  document.getElementById('set-tax').value = db.settings.tax;
}
function saveSettings(){
  const newPrice = currencyValue(document.getElementById('set-price18'));
  if(newPrice !== db.settings.price18){ db.settings.price18UpdatedAt = nowISO(); }
  db.settings.price18 = newPrice;
  db.settings.profit = Number(toEn(document.getElementById('set-profit').value || 0));
  db.settings.tax = Number(toEn(document.getElementById('set-tax').value || 0));
  persist('settings');
  renderTicker();
  addLog('نرخ روز طلا و تنظیمات مالیاتی به‌روزرسانی شد');
  toast('تنظیمات ذخیره شد');
}

/* ============ invoice ============ */
let invoiceLines = [];
let exchangeBuyLines = [];
let expandedLines = new Set();
let editingInvoiceId = null;
let invoiceSettlements = [];
let activeInvoiceMode = 'sell';

function switchInvoiceMode(mode: string){
  activeInvoiceMode = mode || 'sell';

  // Update sidebar active tabs & top switcher buttons
  document.querySelectorAll('.side-tab-item[data-invtype], .inv-mode-tab-btn[data-invtype]').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-invtype') === activeInvoiceMode);
  });

  // Update select dropdown
  const typeSelect = document.getElementById('inv-type') as HTMLSelectElement;
  if(typeSelect && typeSelect.value !== activeInvoiceMode){
    typeSelect.value = activeInvoiceMode;
  }

  // Update status badge
  const modeBadge = document.getElementById('inv-mode-badge');
  if(modeBadge){
    if(activeInvoiceMode === 'sell'){
      modeBadge.textContent = '✨ فاکتور فروش';
      modeBadge.style.background = 'rgba(201,162,39,0.15)';
      modeBadge.style.color = 'var(--gold-bright)';
    } else if(activeInvoiceMode === 'buy'){
      modeBadge.textContent = '📥 فاکتور خرید';
      modeBadge.style.background = 'rgba(74,222,128,0.15)';
      modeBadge.style.color = 'var(--success)';
    } else if(activeInvoiceMode === 'exchange'){
      modeBadge.textContent = '🔄 فاکتور تعویض';
      modeBadge.style.background = 'rgba(96,165,250,0.15)';
      modeBadge.style.color = 'var(--accent-blue)';
    }
  }

  // Update UI texts & headers
  const pageTitle = document.getElementById('inv-page-title');
  const pageDesc = document.getElementById('inv-page-desc');
  const helpEl = document.getElementById('inv-mode-help');
  const section1Title = document.getElementById('inv-section1-title');
  const exchangeSection = document.getElementById('invoice-exchange-buy-section');
  const summaryBoxTitle = document.getElementById('inv-summary-box-title');
  const settlementTitle = document.getElementById('settlement-title');

  if(activeInvoiceMode === 'sell'){
    if(pageTitle) pageTitle.textContent = 'فاکتور فروش طلا';
    if(pageDesc) pageDesc.textContent = 'اجرت، سود و مالیات طبق ماده ۲۶ قانون مالیات بر ارزش افزوده (معافیت اصل طلا) محاسبه می‌شود';
    if(helpEl) helpEl.textContent = 'در فاکتور فروش، اصل طلا طبق ماده ۲۶ از مالیات معاف بوده و اجرت، سود و مالیات ارزش‌افزوده محاسبه و به بدهی شخص منظور می‌شود.';
    if(section1Title) section1Title.textContent = '✨ اقلام فروش به مشتری (خروج کالا / طلای نو)';
    if(exchangeSection) exchangeSection.style.display = 'none';
    if(summaryBoxTitle) summaryBoxTitle.textContent = 'ریز محاسبات و پیش‌فاکتور فروش';
    if(settlementTitle) settlementTitle.textContent = 'روش تسویه و پرداخت فاکتور (اختیاری)';
  } else if(activeInvoiceMode === 'buy'){
    if(pageTitle) pageTitle.textContent = 'فاکتور خرید طلا از مشتری';
    if(pageDesc) pageDesc.textContent = 'خرید طلای متفرقه، مستعمل یا سکه از مشتری و ثبت در موجودی انبار';
    if(helpEl) helpEl.textContent = 'در فاکتور خرید، ارزش طلای خریداری شده بر اساس عیار و وزن محاسبه شده و به عنوان بستانکاری به حساب شخص منظور می‌شود.';
    if(section1Title) section1Title.textContent = '📥 اقلام خرید از مشتری (ورود کالا)';
    if(exchangeSection) exchangeSection.style.display = 'none';
    if(summaryBoxTitle) summaryBoxTitle.textContent = 'ریز محاسبات فاکتور خرید طلا';
    if(settlementTitle) settlementTitle.textContent = 'روش پرداخت وجه خرید به مشتری (اختیاری)';
  } else if(activeInvoiceMode === 'exchange'){
    if(pageTitle) pageTitle.textContent = 'فاکتور تعویض طلا (تهاتر / Trade-in)';
    if(pageDesc) pageDesc.textContent = 'بخش بالا: طلای نو انتخابی مشتری — بخش پایین: طلای کهنه دریافتی از مشتری — محاسبه خودکار مابه‌التفاوت و تسویه';
    if(helpEl) helpEl.textContent = 'در فاکتور تعویض، بخش اول مربوط به طلای نو تحویلی به مشتری و بخش دوم مربوط به طلای کهنه دریافتی است. مابه‌التفاوت وزنی و ریالی در ریز محاسبات تعیین می‌گردد.';
    if(section1Title) section1Title.textContent = '✨ ۱. اقلام فروش به مشتری (طلای نو / کالای انتخابی مشتری)';
    if(exchangeSection) exchangeSection.style.display = 'block';
    if(summaryBoxTitle) summaryBoxTitle.textContent = 'ریز محاسبات، مابه‌التفاوت و صورتحساب تعویض';
    if(settlementTitle) settlementTitle.textContent = 'روش تسویه و پرداخت مابه‌التفاوت تعویض (اختیاری)';

    if(!exchangeBuyLines.length){
      addExchangeBuyLine();
    }
  }

  renderInvoiceLines();
  if(activeInvoiceMode === 'exchange'){
    renderExchangeBuyLines();
  }
  renderInvoiceSummary();
}

function onInvoiceTypeSelectChange(val: string){
  switchInvoiceMode(val);
}

function renderInvoiceView(){
  document.getElementById('inv-customer').value = '';
  document.getElementById('inv-customer-display').value = '';
  expandedLines = new Set();

  const submitBtn = document.getElementById('inv-submit-btn');
  const editNotice = document.getElementById('inv-edit-notice');

  if(editingInvoiceId){
    const inv = db.invoices.find(x => x.id === editingInvoiceId);
    if(inv){
      const cust = db.customers.find(c => c.id === inv.customerId);
      document.getElementById('inv-customer').value = inv.customerId;
      document.getElementById('inv-customer-display').value = cust ? cust.name : '';
      activeInvoiceMode = inv.type || 'sell';
      document.getElementById('inv-type').value = activeInvoiceMode;
      document.getElementById('inv-account-mode').value = inv.accountMode || 'rial';
      document.getElementById('inv-note').value = inv.note || '';
      document.getElementById('inv-discount').value = inv.invoiceDiscountFlat ? fmtMoneyInput(inv.invoiceDiscountFlat) : '';
      document.getElementById('inv-discount-percent').value = inv.invoiceDiscountPercent || '';
      document.getElementById('inv-date').value = toDateInputValue(inv.date);
      const permDisplay = document.getElementById('inv-perm-id-display');
      if(permDisplay) permDisplay.textContent = toFa(inv.permanentId || 2);
      const docNumInp = document.getElementById('inv-doc-num') as HTMLInputElement | null;
      if(docNumInp) docNumInp.value = String(inv.documentNumber || 2);
      const invNumInp = document.getElementById('inv-num') as HTMLInputElement | null;
      if(invNumInp) invNumInp.value = String(inv.number || 1);
      const docNumDisplay = document.getElementById('inv-document-number-display') as HTMLInputElement | null;
      if(docNumDisplay) docNumDisplay.value = inv.documentNumber ? toFa(inv.documentNumber) : '—';
      const invNumDisplay = document.getElementById('inv-invoice-number-display') as HTMLInputElement | null;
      if(invNumDisplay) invNumDisplay.value = '#' + toFa(inv.number);

      invoiceLines = (inv.items || []).map(it => ({
        id: uuid(),
        itemId: it.itemId || 'custom',
        itemName: it.itemName,
        barcode: it.barcode || '',
        weight: it.weight,
        weightRaw: it.weightRaw != null ? it.weightRaw : it.weight,
        weightUnit: it.weightUnit || 'gram',
        karat: it.karat || 18,
        price18: it.price18 || db.settings.price18,
        wagePercent: it.wagePercent || 0,
        discountPercent: it.discountPercent || 0,
        taxExempt: !!it.taxExempt,
        manualMode: !it.itemId
      }));

      exchangeBuyLines = (inv.exchangeItems || []).map(ex => ({
        id: uuid(),
        itemName: ex.itemName || 'طلای کهنه / متفرقه',
        weight: ex.weight || 0,
        weightRaw: ex.weightRaw != null ? ex.weightRaw : ex.weight,
        weightUnit: ex.weightUnit || 'gram',
        karat: ex.karat || 18,
        price18: ex.price18 || db.settings.price18
      }));

      if(submitBtn) submitBtn.textContent = 'بروزرسانی فاکتور';
      if(editNotice){
        editNotice.style.display = 'block';
        editNotice.textContent = `در حال ویرایش فاکتور #${inv.number} — ثبت مجدد، اسناد قبلی را بازنویسی می‌کند`;
      }
      invoiceSettlements = [];
      document.getElementById('settlement-section').style.display = 'none';
      document.getElementById('settlement-edit-notice').style.display = 'block';

      switchInvoiceMode(activeInvoiceMode);
      return;
    }
  }

  document.getElementById('inv-account-mode').value = 'rial';
  document.getElementById('inv-note').value = '';
  document.getElementById('inv-discount').value = '';
  document.getElementById('inv-discount-percent').value = '';
  document.getElementById('inv-date').value = toDateInputValue(new Date());
  const permDisplay = document.getElementById('inv-perm-id-display');
  if(permDisplay) permDisplay.textContent = toFa(getNextPermanentId()) + ' (جدید)';
  const docNumInp = document.getElementById('inv-doc-num') as HTMLInputElement | null;
  if(docNumInp) docNumInp.value = String(getNextDocumentNumber());
  const invNumInp = document.getElementById('inv-num') as HTMLInputElement | null;
  if(invNumInp) invNumInp.value = String(getNextInvoiceNumber());
  const docNumDisplay = document.getElementById('inv-document-number-display') as HTMLInputElement | null;
  if(docNumDisplay) docNumDisplay.value = toFa(getNextDocumentNumber());
  const invNumDisplay = document.getElementById('inv-invoice-number-display') as HTMLInputElement | null;
  if(invNumDisplay) invNumDisplay.value = '#' + toFa(getNextInvoiceNumber());
  if(submitBtn) submitBtn.textContent = 'ثبت فاکتور';
  if(editNotice) editNotice.style.display = 'none';
  document.getElementById('settlement-section').style.display = 'block';
  document.getElementById('settlement-edit-notice').style.display = 'none';
  invoiceSettlements = [];
  renderInvoiceSettlements();
  invoiceLines = [];
  exchangeBuyLines = [];
  addInvoiceLine();
  switchInvoiceMode(activeInvoiceMode || 'sell');
}

function addInvoiceLine(){
  invoiceLines.push({
    id: uuid(),
    itemId: 'custom',
    itemName: '',
    barcode: '',
    weight: 0,
    weightRaw: 0,
    weightUnit: 'gram',
    karat: 18,
    wagePercent: 0,
    discountPercent: 0,
    price18: db.settings.price18,
    taxExempt: false,
    manualMode: false
  });
  renderInvoiceLines();
}

function removeInvoiceLine(id){
  invoiceLines = invoiceLines.filter(l => l.id !== id);
  if(!invoiceLines.length) addInvoiceLine();
  else renderInvoiceLines();
}

function addExchangeBuyLine(presetName?: string, presetKarat = 18){
  exchangeBuyLines.push({
    id: uuid(),
    itemName: presetName || 'طلای کهنه و مستعمل',
    weight: 0,
    weightRaw: 0,
    weightUnit: 'gram',
    karat: presetKarat,
    price18: db.settings.price18
  });
  renderExchangeBuyLines();
}

function removeExchangeBuyLine(id: string){
  exchangeBuyLines = exchangeBuyLines.filter(l => l.id !== id);
  if(!exchangeBuyLines.length && activeInvoiceMode === 'exchange'){
    addExchangeBuyLine();
  } else {
    renderExchangeBuyLines();
  }
}

function updateExchangeLine(id: string, field: string, value: any){
  const line = exchangeBuyLines.find(l => l.id === id);
  if(!line) return;
  line[field] = value;
  renderExchangeBuyLines();
}

function updateExchangeLineName(id: string, val: string){
  const line = exchangeBuyLines.find(l => l.id === id);
  if(!line) return;
  line.itemName = val;
  renderInvoiceSummary();
}

function updateExchangeLineWeight(lineId: string){
  const line = exchangeBuyLines.find(l => l.id === lineId);
  if(!line) return;
  const rawInput = document.getElementById(`ex-weight-${lineId}`) as HTMLInputElement;
  const unitSelect = document.getElementById(`ex-unit-${lineId}`) as HTMLSelectElement;
  if(rawInput && unitSelect){
    const rawVal = parseFloat(toEn(rawInput.value)) || 0;
    line.weightRaw = rawVal;
    line.weightUnit = unitSelect.value;
    line.weight = unitSelect.value === 'sut' ? rawVal / 1000 : rawVal;
  }
  const sumEl = document.getElementById(`ex-sum-${lineId}`) as HTMLInputElement;
  if(sumEl){
    const c = calcExchangeBuyLine(line);
    sumEl.value = toFa(Math.round(c.amount)) + ' ریال';
  }
  renderInvoiceSummary();
}

function calcExchangeBuyLine(line: any){
  const price18 = Number(line.price18 || db.settings.price18);
  const weight = Number(line.weight || 0);
  const karat = Number(line.karat || 18);
  const karatWeight = weight * (karat / 18);
  const amount = Math.round(weight * price18 * (karat / 18));
  return { price18, weight, karat, karatWeight, amount };
}

function renderExchangeBuyLines(){
  const wrap = document.getElementById('exchange-buy-lines');
  if(!wrap) return;
  wrap.innerHTML = '';

  exchangeBuyLines.forEach((line, idx) => {
    const row = document.createElement('div');
    row.className = 'invoice-line';
    row.style.borderRight = '3px solid var(--success)';
    const c = calcExchangeBuyLine(line);
    row.innerHTML = `
      <div class="field">
        <label>شرح طلای دریافتی (ردیف ${idx+1})</label>
        <input id="ex-name-${line.id}" value="${escAttr(line.itemName)}" placeholder="مثلاً: النگو کهنه، طلای شکسته، متفرقه..." oninput="updateExchangeLineName('${line.id}', this.value)">
      </div>
      <div class="field">
        <label>وزن دریافتی</label>
        <div style="display:flex; gap:4px;">
          <input id="ex-weight-${line.id}" type="number" step="0.001" value="${line.weightRaw||''}" style="flex:1;" oninput="updateExchangeLineWeight('${line.id}')">
          <select id="ex-unit-${line.id}" style="flex:0 0 62px; padding:9px 2px; font-size:11px;" onchange="updateExchangeLineWeight('${line.id}')">
            <option value="gram" ${(!line.weightUnit || line.weightUnit==='gram')?'selected':''}>گرم</option>
            <option value="sut" ${line.weightUnit==='sut'?'selected':''}>سوت</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>عیار</label>
        <select id="ex-karat-${line.id}" onchange="updateExchangeLine('${line.id}','karat',this.value)">
          <option value="24" ${line.karat==24?'selected':''}>۲۴ (شمش)</option>
          <option value="21" ${line.karat==21?'selected':''}>۲۱</option>
          <option value="18" ${line.karat==18?'selected':''}>۱۸ (۷۵۰)</option>
          <option value="17.5" ${line.karat==17.5?'selected':''}>۱۷.۵ (۷۳۰)</option>
          <option value="14" ${line.karat==14?'selected':''}>۱۴ (۵۸۵)</option>
        </select>
      </div>
      <div class="field">
        <label>نرخ خرید ۱۸ (ریال)</label>
        <input id="ex-price-${line.id}" type="text" inputmode="numeric" value="${fmtMoneyInput(line.price18)}" oninput="formatCurrencyInput(this); updateExchangeLine('${line.id}','price18', currencyValue(this))">
      </div>
      <div class="field" style="grid-column: span 2;">
        <label>ارزش طلای دریافتی</label>
        <input id="ex-sum-${line.id}" value="${toFa(Math.round(c.amount))} ریال" disabled style="background:var(--elev-2); font-weight:700; color:var(--success);">
      </div>
      <button class="remove-line" onclick="removeExchangeBuyLine('${line.id}')" title="حذف سطر">✕</button>
    `;
    wrap.appendChild(row);
  });
  renderInvoiceSummary();
}

function addSettlementLine(){
  invoiceSettlements.push({
    id: uuid(),
    method: 'cash',
    accountId: '',
    checkNumber: '',
    checkBank: '',
    checkDueDate: '',
    amount: 0
  });
  renderInvoiceSettlements();
}

function removeSettlementLine(id){
  invoiceSettlements = invoiceSettlements.filter(s => s.id !== id);
  renderInvoiceSettlements();
}

function settlementAccountOptions(method, selectedId){
  const accounts = db.financialAccounts.filter(a => a.type === method);
  if(!accounts.length) return `<option value="">— حساب ${method === 'bank' ? 'بانک' : 'صندوق'} در بخش «مالی» تعریف نشده —</option>`;
  return accounts.map(a => `<option value="${a.id}" ${a.id===selectedId?'selected':''}>${a.name} (${toFa(getAccountBalance(a.id))} ریال)</option>`).join('');
}

function updateSettlementMethod(id, method){
  const s = invoiceSettlements.find(x => x.id === id);
  if(!s) return;
  s.method = method;
  s.accountId = ''; s.checkNumber = ''; s.checkBank = ''; s.checkDueDate = '';
  renderInvoiceSettlements();
}

function updateSettlement(id, field, value){
  const s = invoiceSettlements.find(x => x.id === id);
  if(!s) return;
  s[field] = value;
  renderInvoiceSummary();
}

function renderInvoiceSettlements(){
  const wrap = document.getElementById('invoice-settlements');
  if(!wrap) return;
  wrap.innerHTML = '';
  invoiceSettlements.forEach(s => {
    const row = document.createElement('div');
    row.className = 'settlement-line';
    let detailHtml;
    if(s.method === 'check'){
      detailHtml = `<div style="display:flex; gap:6px;">
          <input id="settle-checknum-${s.id}" placeholder="شماره چک" value="${escAttr(s.checkNumber)}" style="flex:1;" oninput="updateSettlement('${s.id}','checkNumber',this.value)">
          <input id="settle-checkbank-${s.id}" placeholder="بانک چک" value="${escAttr(s.checkBank)}" style="flex:1;" oninput="updateSettlement('${s.id}','checkBank',this.value)">
          <input id="settle-checkdue-${s.id}" type="date" value="${s.checkDueDate||''}" style="flex:0 0 132px;" oninput="updateSettlement('${s.id}','checkDueDate',this.value)">
        </div>`;
    } else {
      detailHtml = `<select id="settle-account-${s.id}" onchange="updateSettlement('${s.id}','accountId',this.value)">${settlementAccountOptions(s.method, s.accountId)}</select>`;
    }
    row.innerHTML = `
      <div class="field">
        <label>روش</label>
        <select onchange="updateSettlementMethod('${s.id}', this.value)">
          <option value="cash" ${s.method==='cash'?'selected':''}>نقد (صندوق)</option>
          <option value="bank" ${s.method==='bank'?'selected':''}>کارتخوان / بانک</option>
          <option value="check" ${s.method==='check'?'selected':''}>چک</option>
        </select>
      </div>
      <div class="field">
        <label>${s.method==='check' ? 'مشخصات چک' : 'حساب'}</label>
        ${detailHtml}
      </div>
      <div class="field">
        <label>مبلغ پرداختی (ریال)</label>
        <input id="settle-amount-${s.id}" type="text" inputmode="numeric" value="${fmtMoneyInput(s.amount)}" oninput="formatCurrencyInput(this); updateSettlement('${s.id}','amount', currencyValue(this))">
      </div>
      <button class="remove-line" onclick="removeSettlementLine('${s.id}')" title="حذف">✕</button>
    `;
    wrap.appendChild(row);
  });
  renderInvoiceSummary();
}

function renderSettlementSummary(grandTotal){
  const box = document.getElementById('settlement-summary');
  if(!box) return;
  const total = Number(grandTotal || 0);
  const totalSettled = invoiceSettlements.reduce((s, x) => s + Number(x.amount || 0), 0);
  const remaining = total - totalSettled;
  if(!invoiceSettlements.length){ box.innerHTML = ''; return; }
  let remainLine;
  if(remaining > 0.5){
    remainLine = `<div class="summary-row" style="color:var(--danger); font-weight:700;"><span>مانده بدهی تسویه‌نشده (به‌حساب شخص می‌رود)</span><b>${toFa(Math.round(remaining))} ریال</b></div>`;
  } else if(remaining < -0.5){
    remainLine = `<div class="summary-row" style="color:var(--gold-bright); font-weight:700;"><span>مبلغ اضافه دریافتی (بستانکاری مشتری)</span><b>${toFa(Math.round(-remaining))} ریال</b></div>`;
  } else {
    remainLine = `<div class="summary-row" style="color:var(--success); font-weight:700;"><span>وضعیت تسویه فاکتور</span><b>کاملاً تسویه شد</b></div>`;
  }
  box.innerHTML = `
    <div class="summary-row"><span>جمع کل مبالغ پرداخت‌شده هم‌زمان</span><b>${toFa(Math.round(totalSettled))} ریال</b></div>
    ${remainLine}
  `;
}

function escAttr(s){
  return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderInvoiceLines(){
  const wrap = document.getElementById('invoice-lines');
  if(!wrap) return;
  wrap.innerHTML = '';

  const isBuyOnly = activeInvoiceMode === 'buy';

  invoiceLines.forEach((line, idx) => {
    const row = document.createElement('div');
    row.className = 'invoice-line';
    const isCustom = line.itemId === 'custom' || !line.itemId;
    row.innerHTML = `
      <div class="field">
        <label>${isBuyOnly ? 'شرح طلای خریداری شده' : 'کالا'} (ردیف ${idx+1})</label>
        <div style="display:flex; gap:4px;">
          <input id="name-${line.id}" value="${escAttr(line.itemName)}" placeholder="${isBuyOnly?'مثلاً: النگو کهنه، طلای شکسته...':'نام یا مشخصات کالا...'}" autocomplete="off"
            oninput="updateLineName('${line.id}', this.value)" style="flex:1;">
          <button type="button" class="btn btn-sm" onclick="openKardexModal('${line.id}', document.getElementById('name-${line.id}').value)" title="انتخاب از کاردکس">🔍 کاردکس</button>
        </div>
        <span id="unlink-${line.id}" class="unlink-link" style="display:${isCustom?'none':'block'};" onclick="unlinkInvoiceItem('${line.id}')">لغو اتصال به کاتالوگ و ویرایش دستی</span>
      </div>
      <div class="field">
        <label>وزن</label>
        <div style="display:flex; gap:4px;">
          <input id="weight-${line.id}" type="number" step="0.001" value="${line.weightRaw||''}" style="flex:1;"
            oninput="updateLineWeight('${line.id}')">
          <select id="unit-${line.id}" style="flex:0 0 62px; padding:9px 2px; font-size:11px;" onchange="updateLineWeight('${line.id}')">
            <option value="gram" ${(!line.weightUnit || line.weightUnit==='gram')?'selected':''}>گرم</option>
            <option value="sut" ${line.weightUnit==='sut'?'selected':''}>سوت</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>عیار</label>
        <select id="karat-${line.id}" onchange="updateLine('${line.id}','karat',this.value)" ${isCustom?'':'disabled'}>
          <option value="24" ${line.karat==24?'selected':''}>۲۴ (شمش)</option>
          <option value="21" ${line.karat==21?'selected':''}>۲۱</option>
          <option value="18" ${line.karat==18?'selected':''}>۱۸ (۷۵۰)</option>
          <option value="17.5" ${line.karat==17.5?'selected':''}>۱۷.۵ (۷۳۰)</option>
          <option value="14" ${line.karat==14?'selected':''}>۱۴ (۵۸۵)</option>
        </select>
      </div>
      <div class="field">
        <label>نرخ پایه ۱۸ (ریال)</label>
        <input id="price-${line.id}" type="text" inputmode="numeric" value="${fmtMoneyInput(line.price18)}" oninput="formatCurrencyInput(this); updateLine('${line.id}','price18', currencyValue(this))">
      </div>
      <div class="field" style="${isBuyOnly?'display:none;':''}">
        <label>اجرت (%)</label>
        <input id="wage-${line.id}" type="number" step="0.1" value="${line.wagePercent||''}" placeholder="0" oninput="updateLine('${line.id}','wagePercent',this.value)">
      </div>
      <div class="field" style="${isBuyOnly?'display:none;':''}">
        <label>تخفیف (%)</label>
        <input id="discount-${line.id}" type="number" step="0.1" value="${line.discountPercent||''}" placeholder="0" oninput="updateLine('${line.id}','discountPercent',this.value)">
      </div>
      <div class="field" style="${isBuyOnly?'grid-column: span 2;':''}">
        <label>جمع کل سطر</label>
        <input id="sum-${line.id}" value="${toFa(Math.round(calcLine(line).netFinal))} ریال" disabled style="background:var(--elev-2); font-weight:700; color:${isBuyOnly?'var(--success)':'var(--gold-bright)'};">
      </div>
      <button class="remove-line" onclick="removeInvoiceLine('${line.id}')" title="حذف سطر">✕</button>
    `;
    wrap.appendChild(row);
  });
  renderInvoiceSummary();
}

function updateLineName(lineId, val){
  const line = invoiceLines.find(l => l.id === lineId);
  if(!line) return;
  line.itemName = val;
  renderInvoiceSummary();
}

let kardexModalLineId = null;
function openKardexModal(lineId, initialQuery){
  kardexModalLineId = lineId;
  const overlay = document.getElementById('kardex-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  const searchEl = document.getElementById('kardex-modal-search');
  if(searchEl){
    searchEl.value = initialQuery || '';
    renderKardexModalList();
    setTimeout(() => searchEl.focus(), 30);
  }
}
function closeKardexModal(){
  const overlay = document.getElementById('kardex-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  kardexModalLineId = null;
}
function renderKardexModalList(){
  const query = document.getElementById('kardex-modal-search')?.value || '';
  const results = getFilteredSortedInventory(query);
  const list = document.getElementById('kardex-modal-list');
  if(!list) return;
  if(!db.inventory.length){
    list.innerHTML = `<div class="suggest-empty" style="padding:20px; text-align:center;">هنوز کالایی در کاردکس ثبت نشده است</div>`;
  } else if(!results.length){
    list.innerHTML = `<div class="suggest-empty" style="padding:20px; text-align:center;">کالایی با این مشخصات یافت نشد</div>`;
  } else {
    const rows = results.map(i => `<tr class="modal-row" onclick="pickFromKardexModal('${i.id}')">${inventoryRowHtml(i, '<button class="btn btn-gold btn-sm">انتخاب</button>')}</tr>`).join('');
    list.innerHTML = `<table style="width:100%;"><thead>${inventoryHeaderHtml()}</thead><tbody>${rows}</tbody></table>`;
  }
}
function handleKardexModalKeydown(event){
  if(event.key === 'Escape'){ closeKardexModal(); return; }
  if(event.key === 'Enter'){
    const results = getFilteredSortedInventory(document.getElementById('kardex-modal-search').value);
    if(results.length) pickFromKardexModal(results[0].id);
  }
}
function pickFromKardexModal(itemId){
  if(kardexModalLineId){
    pickSuggestion(kardexModalLineId, itemId);
  }
  closeKardexModal();
}
function manualEntryFromModal(){
  const lineId = kardexModalLineId;
  closeKardexModal();
  if(!lineId) return;
  const line = invoiceLines.find(l => l.id === lineId);
  if(line){ line.manualMode = true; line.itemId = 'custom'; }
  renderInvoiceLines();
  setTimeout(() => { const el = document.getElementById('name-' + lineId); if(el) el.focus(); }, 30);
}

let customerModalTarget = 'invoice';
const CUSTOMER_MODAL_TARGETS = {
  invoice: { id: 'inv-customer', display: 'inv-customer-display' },
  check: { id: 'check-customer', display: 'check-customer-display' },
  transaction: { id: 'txn-customer', display: 'txn-customer-display' },
  expense: { id: 'expinc-customer', display: 'expinc-customer-display' },
  manual: { id: 'manual-doc-customer', display: 'manual-doc-customer-display' }
};

function openCustomerModal(initialQuery, target){
  if(target) customerModalTarget = target;
  const overlay = document.getElementById('customer-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  const searchEl = document.getElementById('customer-modal-search');
  if(searchEl){
    searchEl.value = initialQuery || '';
    renderCustomerModalList();
    setTimeout(() => searchEl.focus(), 30);
  }
}
function closeCustomerModal(){
  const overlay = document.getElementById('customer-modal-overlay');
  if(overlay) overlay.style.display = 'none';
}
function renderCustomerModalList(){
  const query = document.getElementById('customer-modal-search')?.value || '';
  const results = getFilteredSortedCustomers(query);
  const list = document.getElementById('customer-modal-list');
  if(!list) return;
  if(!db.customers.length){
    list.innerHTML = `<div class="suggest-empty" style="padding:20px; text-align:center;">هنوز شخصی ثبت نشده است</div>`;
  } else if(!results.length){
    list.innerHTML = `<div class="suggest-empty" style="padding:20px; text-align:center;">شخصی با این مشخصات یافت نشد</div>`;
  } else {
    const rows = results.map(c => `<tr class="modal-row" onclick="pickFromCustomerModal('${c.id}')">${customerRowHtml(c, '<button class="btn btn-gold btn-sm">انتخاب</button>')}</tr>`).join('');
    list.innerHTML = `<table style="width:100%;"><thead>${customersHeaderHtml()}</thead><tbody>${rows}</tbody></table>`;
  }
}
function handleCustomerModalKeydown(event){
  if(event.key === 'Escape'){ closeCustomerModal(); return; }
  if(event.key === 'Enter'){
    const results = getFilteredSortedCustomers(document.getElementById('customer-modal-search').value);
    if(results.length) pickFromCustomerModal(results[0].id);
  }
}
function pickFromCustomerModal(customerId){
  const cust = db.customers.find(c => c.id === customerId);
  const target = CUSTOMER_MODAL_TARGETS[customerModalTarget] || CUSTOMER_MODAL_TARGETS.invoice;
  if(cust){
    const idEl = document.getElementById(target.id);
    const dispEl = document.getElementById(target.display);
    if(idEl) idEl.value = cust.id;
    if(dispEl) dispEl.value = cust.name;
  }
  closeCustomerModal();
}

function pickSuggestion(lineId, itemId){
  const line = invoiceLines.find(l => l.id === lineId);
  const item = db.inventory.find(i => i.id === itemId);
  if(!line || !item) return;
  line.itemId = item.id;
  line.itemName = item.name;
  line.barcode = item.barcode || '';
  line.karat = item.karat;
  line.wagePercent = item.wage;
  line.taxExempt = !!item.taxExempt;
  line.manualMode = false;

  const nameEl = document.getElementById('name-' + lineId);
  const karatEl = document.getElementById('karat-' + lineId);
  const wageEl = document.getElementById('wage-' + lineId);
  if(nameEl) nameEl.value = item.name;
  if(karatEl) karatEl.value = item.karat;
  if(wageEl) wageEl.value = item.wage;
  setLineLockState(lineId, true);
  const unlinkEl = document.getElementById('unlink-' + lineId);
  if(unlinkEl) unlinkEl.style.display = 'block';
  refreshLineSum(lineId);
}

function unlinkInvoiceItem(lineId){
  const line = invoiceLines.find(l => l.id === lineId);
  if(!line) return;
  line.itemId = 'custom';
  line.taxExempt = false;
  line.manualMode = true;
  setLineLockState(lineId, false);
  const unlinkEl = document.getElementById('unlink-' + lineId);
  if(unlinkEl) unlinkEl.style.display = 'none';
  refreshLineSum(lineId);
}

function setLineLockState(lineId, locked){
  const karatEl = document.getElementById('karat-' + lineId);
  if(karatEl) karatEl.disabled = locked;
}

function updateLineWeight(lineId){
  const line = invoiceLines.find(l => l.id === lineId);
  if(!line) return;
  const rawInput = document.getElementById('weight-' + lineId);
  const unitSelect = document.getElementById('unit-' + lineId);
  const raw = Number(toEn(rawInput ? rawInput.value : 0));
  const unit = unitSelect ? unitSelect.value : 'gram';
  line.weightRaw = raw;
  line.weightUnit = unit;
  line.weight = toGrams(raw, unit === 'sut' ? 'sut' : 'gram');
  refreshLineSum(lineId);
}

function updateLine(id, field, value){
  const line = invoiceLines.find(l => l.id === id);
  if(!line) return;
  line[field] = Number(toEn(value));
  refreshLineSum(id);
}

function refreshLineSum(lineId){
  const line = invoiceLines.find(l => l.id === lineId);
  if(!line) return;
  const sumEl = document.getElementById('sum-' + lineId);
  if(sumEl) sumEl.value = toFa(Math.round(calcLine(line).netFinal)) + ' ریال';
  renderInvoiceSummary();
}

/*
  Accounting standard per Article 26 of Iran VAT law:
  - Gold base value = weight * price18 * (karat/18) -> 100% EXEMPT from VAT.
  - Wage = goldBase * (wagePercent/100)
  - Profit = (goldBase + wage) * (profitPercent/100)
  - Line discount is applied to (goldBase + wage + profit).
  - Taxable base = (wage + profit) proportionally discounted.
  - Tax = taxableBase * 10% VAT.
  - Line Total = (goldBase + wage + profit - discount) + tax.
*/
function calcLine(line){
  const price18 = Number(line.price18 || db.settings.price18);
  const goldPrice = Number(line.weight || 0) * price18 * (Number(line.karat || 18) / 18);
  
  if(activeInvoiceMode === 'buy'){
    // Scrap/customer gold purchase: direct scrap gold valuation
    const netFinal = goldPrice;
    return { goldPrice, wage: 0, profit: 0, tax: 0, discount: 0, netFinal };
  }

  const wage = goldPrice * (Number(line.wagePercent || 0) / 100);
  const profit = (goldPrice + wage) * (Number(db.settings.profit || 0) / 100);
  const discountPercent = Number(line.discountPercent || 0);
  const lineBase = goldPrice + wage + profit;
  const discount = lineBase * (discountPercent / 100);

  const discountedWageProfit = (wage + profit) * (1 - discountPercent / 100);
  const taxableBase = line.taxExempt ? 0 : Math.max(0, discountedWageProfit);
  const tax = taxableBase * (Number(db.settings.tax || 0) / 100);
  const netFinal = (lineBase - discount) + tax;

  return { goldPrice, wage, profit, tax, discount, netFinal };
}

function toggleLineDetail(lineId){
  if(expandedLines.has(lineId)) expandedLines.delete(lineId);
  else expandedLines.add(lineId);
  renderInvoiceSummary();
}

function renderInvoiceSummary(){
  const box = document.getElementById('invoice-summary');
  if(!box) return;

  const validLines = invoiceLines.filter(l => l.weight > 0);
  const validExLines = exchangeBuyLines.filter(l => l.weight > 0);

  if(!validLines.length && (activeInvoiceMode !== 'exchange' || !validExLines.length)){
    box.innerHTML = '<div class="empty">هنوز قلمی با وزن معتبر اضافه نشده است</div>';
    return;
  }

  let totals = { goldPrice: 0, wage: 0, profit: 0, tax: 0, discount: 0, netFinal: 0, weight: 0, karatWeight: 0 };
  let linesHtml = '';

  validLines.forEach(l => {
    const c = calcLine(l);
    const kw = Number(l.weight) * (Number(l.karat) / 18);
    totals.goldPrice += c.goldPrice;
    totals.wage += c.wage;
    totals.profit += c.profit;
    totals.tax += c.tax;
    totals.discount += c.discount;
    totals.netFinal += c.netFinal;
    totals.weight += Number(l.weight);
    totals.karatWeight += kw;

    const isOpen = expandedLines.has(l.id);
    linesHtml += `
      <div style="border:1px solid var(--border); border-radius:8px; margin-bottom:8px; background:var(--elev); overflow:hidden;">
        <div onclick="toggleLineDetail('${l.id}')" style="cursor:pointer; padding:10px 12px; display:flex; justify-content:space-between; align-items:center; user-select:none;">
          <span style="font-weight:700; font-size:12.5px; display:flex; align-items:center; gap:6px;">
            <span style="color:var(--gold-bright); font-size:11px; transition:.15s; transform:rotate(${isOpen?'0':'-90deg'});">▾</span>
            ${l.itemName || 'کالای طلا'}
            <span style="color:var(--text-faint); font-weight:500; font-size:11.5px;">(${toFa(l.weight)} گرم — عیار ${toFa(l.karat)})</span>
          </span>
          <b style="color:var(--gold-bright); font-size:12.5px;">${toFa(Math.round(c.netFinal))} ریال</b>
        </div>
        ${isOpen ? `
        <div style="padding:0 12px 10px; border-top:1px solid var(--border); background:rgba(0,0,0,0.15);">
          <div class="summary-row" style="padding:7px 0 2px; font-size:11.5px;"><span>۱. ارزش اصل طلا (معاف از مالیات)</span><b>${toFa(Math.round(c.goldPrice))} ریال</b></div>
          ${activeInvoiceMode !== 'buy' ? `
          <div class="summary-row" style="padding:2px 0; font-size:11.5px;"><span>۲. اجرت ساخت (${toFa(l.wagePercent)}٪)</span><b>${toFa(Math.round(c.wage))} ریال</b></div>
          <div class="summary-row" style="padding:2px 0; font-size:11.5px;"><span>۳. سود فروشنده (${db.settings.profit}٪)</span><b>${toFa(Math.round(c.profit))} ریال</b></div>
          <div class="summary-row" style="padding:2px 0; font-size:11.5px;"><span>۴. مالیات ارزش‌افزوده (${l.taxExempt ? 'معاف' : db.settings.tax+'٪ فقط از اجرت و سود'})</span><b>${toFa(Math.round(c.tax))} ریال</b></div>
          ${c.discount > 0 ? `<div class="summary-row" style="padding:2px 0; font-size:11.5px; color:var(--danger);"><span>۵. تخفیف این قلم (${toFa(l.discountPercent)}٪)</span><b>− ${toFa(Math.round(c.discount))} ریال</b></div>` : ''}
          ` : ''}
        </div>` : ''}
      </div>
    `;
  });

  const invDiscFlatEl = document.getElementById('inv-discount') as HTMLInputElement;
  const invDiscountFlat = invDiscFlatEl ? currencyValue(invDiscFlatEl) : 0;
  const invDiscountPercent = Number(toEn((document.getElementById('inv-discount-percent') as HTMLInputElement)?.value || 0));

  if(activeInvoiceMode === 'exchange'){
    // ============ EXCHANGE INVOICE SUMMARY ============
    let exTotals = { weight: 0, karatWeight: 0, amount: 0 };
    let exLinesHtml = '';

    validExLines.forEach(l => {
      const c = calcExchangeBuyLine(l);
      exTotals.weight += c.weight;
      exTotals.karatWeight += c.karatWeight;
      exTotals.amount += c.amount;

      exLinesHtml += `
        <div style="padding:6px 10px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:12px;">
          <span><b>${l.itemName || 'طلای دریافتی'}</b> <span style="color:var(--text-faint);">(${toFa(l.weight)} گرم — عیار ${toFa(l.karat)})</span></span>
          <b style="color:var(--success);">${toFa(Math.round(c.amount))} ریال</b>
        </div>
      `;
    });

    const sellTotalGross = totals.netFinal;
    const scrapTotal = exTotals.amount;
    const grossDifference = sellTotalGross - scrapTotal;

    const afterPercent = grossDifference > 0 ? (grossDifference * (1 - invDiscountPercent / 100)) : grossDifference;
    const netDifference = grossDifference > 0 ? Math.max(0, afterPercent - invDiscountFlat) : (afterPercent + invDiscountFlat);
    const invoiceLevelDiscount = grossDifference > 0 ? (grossDifference - netDifference) : 0;

    const weightDiff18 = totals.karatWeight - exTotals.karatWeight;

    let diffStatusHtml = '';
    if(netDifference > 0.5){
      diffStatusHtml = `
        <div class="summary-row summary-total" style="background:rgba(217, 119, 6, 0.15); border-color:var(--gold-dim);">
          <span style="color:var(--gold-bright);">مابه‌التفاوت قابل پرداخت توسط مشتری (بدهکاری مشتری)</span>
          <span style="color:var(--gold-bright);">${toFa(Math.round(netDifference))} ریال</span>
        </div>
      `;
    } else if(netDifference < -0.5){
      diffStatusHtml = `
        <div class="summary-row summary-total" style="background:rgba(16, 185, 129, 0.15); border-color:var(--success);">
          <span style="color:var(--success);">مابه‌التفاوت قابل پرداخت به مشتری (بستانکاری مشتری)</span>
          <span style="color:var(--success);">${toFa(Math.round(-netDifference))} ریال</span>
        </div>
      `;
    } else {
      diffStatusHtml = `
        <div class="summary-row summary-total" style="background:rgba(59, 130, 246, 0.15); border-color:var(--accent);">
          <span style="color:var(--text);">تهاتر پایاپای کامل (بدون مابه‌التفاوت ریالی)</span>
          <span>۰ ریال</span>
        </div>
      `;
    }

    let weightDiffStatus = '';
    if(weightDiff18 > 0.001){
      weightDiffStatus = `<b style="color:var(--gold-bright);">+ ${toFa(weightDiff18.toFixed(3))} گرم (کسری طلا / بدهکار وزنی)</b>`;
    } else if(weightDiff18 < -0.001){
      weightDiffStatus = `<b style="color:var(--success);">− ${toFa((-weightDiff18).toFixed(3))} گرم (مازاد طلا / بستانکار وزنی)</b>`;
    } else {
      weightDiffStatus = `<b>تسویه وزنی پایاپای</b>`;
    }

    box.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;">
        <!-- SELL GOODS SUMMARY -->
        <div style="background:var(--elev); padding:12px; border-radius:8px; border:1px solid var(--gold-dim);">
          <div style="font-weight:700; font-size:12.5px; color:var(--gold-bright); margin-bottom:8px;">✨ الف) اقلام فروش به مشتری:</div>
          <div style="margin-bottom:8px;">${linesHtml || '<div class="stat-sub">اقلامی وارد نشده</div>'}</div>
          <div class="summary-row" style="font-size:11.5px;"><span>وزن کل فروش / معادل ۱۸</span><b>${toFa(totals.weight.toFixed(3))} / ${toFa(totals.karatWeight.toFixed(3))} g</b></div>
          <div class="summary-row" style="font-size:11.5px;"><span>جمع اصل طلا</span><b>${toFa(Math.round(totals.goldPrice))} ریال</b></div>
          <div class="summary-row" style="font-size:11.5px;"><span>جمع اجرت + سود + مالیات</span><b>${toFa(Math.round(totals.wage + totals.profit + totals.tax))} ریال</b></div>
          <div class="summary-row" style="font-weight:700; border-top:1px solid var(--border); padding-top:4px;"><span>جمع کل ارزش فروش (الف)</span><b style="color:var(--gold-bright);">${toFa(Math.round(sellTotalGross))} ریال</b></div>
        </div>

        <!-- BUY SCRAP SUMMARY -->
        <div style="background:var(--elev); padding:12px; border-radius:8px; border:1px solid var(--success);">
          <div style="font-weight:700; font-size:12.5px; color:var(--success); margin-bottom:8px;">♻️ ب) طلای کهنه دریافتی از مشتری:</div>
          <div style="margin-bottom:8px;">${exLinesHtml || '<div class="stat-sub">طلای دریافتی وارد نشده</div>'}</div>
          <div class="summary-row" style="font-size:11.5px;"><span>وزن کل دریافتی / معادل ۱۸</span><b>${toFa(exTotals.weight.toFixed(3))} / ${toFa(exTotals.karatWeight.toFixed(3))} g</b></div>
          <div class="summary-row" style="font-weight:700; border-top:1px solid var(--border); padding-top:4px;"><span>جمع ارزش طلای کهنه (ب)</span><b style="color:var(--success);">${toFa(Math.round(scrapTotal))} ریال</b></div>
        </div>
      </div>

      <div style="font-weight:700; font-size:13px; margin-bottom:8px; color:var(--text-dim);">⚖️ ریز محاسبات مابه‌التفاوت و تسویه تعویض:</div>
      <div class="summary-row"><span>مابه‌التفاوت وزنی (معادل ۱۸ عیار)</span>${weightDiffStatus}</div>
      <div class="summary-row"><span>مابه‌التفاوت ناخالص ریالی (الف کسر از ب)</span><b>${toFa(Math.round(grossDifference))} ریال</b></div>
      ${totals.discount > 0 ? `<div class="summary-row" style="color:var(--danger);"><span>جمع تخفیفات سطری</span><b>− ${toFa(Math.round(totals.discount))} ریال</b></div>` : ''}
      ${invoiceLevelDiscount > 0 ? `<div class="summary-row" style="color:var(--danger);"><span>تخفیف کلی فاکتور</span><b>− ${toFa(Math.round(invoiceLevelDiscount))} ریال</b></div>` : ''}
      ${diffStatusHtml}
    `;

    renderSettlementSummary(netDifference > 0 ? netDifference : 0);
    return;
  }

  // ============ STANDARD SELL OR BUY INVOICE SUMMARY ============
  const afterPercent = totals.netFinal * (1 - invDiscountPercent / 100);
  const grandTotal = Math.max(0, afterPercent - invDiscountFlat);
  const invoiceLevelDiscount = totals.netFinal - grandTotal;

  box.innerHTML = `
    <div style="margin-bottom:14px;">${linesHtml}</div>
    <div style="font-weight:700; font-size:12.5px; margin-bottom:6px; color:var(--text-dim);">جمع‌بندی نهایی فاکتور ${activeInvoiceMode==='buy'?'خرید طلا':'فروش'}</div>
    <div class="summary-row"><span>وزن کل اقلام</span><b>${toFa(totals.weight.toFixed(3))} گرم</b></div>
    <div class="summary-row"><span>معادل وزنی ۱۸ عیار</span><b>${toFa(totals.karatWeight.toFixed(3))} گرم</b></div>
    <div class="summary-row"><span>جمع ارزش اصل طلا</span><b>${toFa(Math.round(totals.goldPrice))} ریال</b></div>
    ${activeInvoiceMode === 'sell' ? `
    <div class="summary-row"><span>جمع اجرت ساخت</span><b>${toFa(Math.round(totals.wage))} ریال</b></div>
    <div class="summary-row"><span>جمع سود فروشگاه (${db.settings.profit}٪)</span><b>${toFa(Math.round(totals.profit))} ریال</b></div>
    <div class="summary-row"><span>جمع مالیات بر ارزش‌افزوده (ماده ۲۶)</span><b>${toFa(Math.round(totals.tax))} ریال</b></div>
    ` : ''}
    ${totals.discount > 0 ? `<div class="summary-row" style="color:var(--danger);"><span>جمع تخفیف سطری</span><b>− ${toFa(Math.round(totals.discount))} ریال</b></div>` : ''}
    ${invoiceLevelDiscount > 0 ? `<div class="summary-row" style="color:var(--danger);"><span>تخفیف کلی فاکتور</span><b>− ${toFa(Math.round(invoiceLevelDiscount))} ریال</b></div>` : ''}
    <div class="summary-row summary-total"><span>${activeInvoiceMode==='buy'?'مبلغ کل قابل پرداخت به مشتری':'مبلغ نهایی قابل‌پرداخت'}</span><span>${toFa(Math.round(grandTotal))} ریال</span></div>
  `;
  renderSettlementSummary(grandTotal);
}

function submitInvoice(){
  const customerId = (document.getElementById('inv-customer') as HTMLInputElement).value;
  if(!customerId){ toast('ابتدا یک شخص انتخاب کنید'); return; }

  const type = activeInvoiceMode || (document.getElementById('inv-type') as HTMLSelectElement).value || 'sell';
  const validLines = invoiceLines.filter(l => l.weight > 0 && l.itemName);
  const validExLines = exchangeBuyLines.filter(l => l.weight > 0);

  if(!validLines.length && (type !== 'exchange' || !validExLines.length)){
    toast('حداقل یک قلم کالا با نام و وزن معتبر وارد کنید');
    return;
  }

  const accountMode = (document.getElementById('inv-account-mode') as HTMLSelectElement).value;
  const note = (document.getElementById('inv-note') as HTMLInputElement).value.trim();
  const dateInputVal = (document.getElementById('inv-date') as HTMLInputElement).value;
  const sanadDate = dateInputVal ? new Date(dateInputVal + 'T00:00:00').toISOString() : nowISO();

  // Reverse previous effects on customer if editing
  if(editingInvoiceId){
    const oldInv = db.invoices.find(x => x.id === editingInvoiceId);
    if(oldInv){
      const oldCust = db.customers.find(c => c.id === oldInv.customerId);
      if(oldCust){
        if(oldInv.accountMode === 'gold'){
          const oldKaratWeight = oldInv.type === 'exchange' ? (oldInv.diffWeight18 || 0) : (oldInv.karatWeightSum || 0);
          if(oldInv.type === 'sell' || oldInv.type === 'exchange') oldCust.goldBalance18 -= oldKaratWeight;
          else oldCust.goldBalance18 += oldKaratWeight;
        } else {
          if(oldInv.type === 'sell' || oldInv.type === 'exchange') oldCust.tomanBalance -= (oldInv.total || 0);
          else oldCust.tomanBalance += (oldInv.total || 0);
        }
      }
    }
  }

  let subtotal = 0, goldPriceSum = 0, wageSum = 0, profitSum = 0, taxSum = 0, weightSum = 0, lineDiscountSum = 0, karatWeightSum = 0;
  const items = validLines.map(l => {
    const c = calcLine(l);
    subtotal += c.netFinal;
    goldPriceSum += c.goldPrice;
    wageSum += c.wage;
    profitSum += c.profit;
    taxSum += c.tax;
    weightSum += Number(l.weight);
    lineDiscountSum += c.discount;
    karatWeightSum += Number(l.weight) * (Number(l.karat) / 18);
    return {
      itemId: l.itemId !== 'custom' ? l.itemId : null,
      itemName: l.itemName,
      barcode: l.barcode || '',
      weight: l.weight,
      weightRaw: l.weightRaw,
      weightUnit: l.weightUnit,
      karat: l.karat,
      taxExempt: !!l.taxExempt,
      price18: l.price18,
      wagePercent: l.wagePercent,
      discountPercent: l.discountPercent || 0,
      amount: Math.round(c.netFinal)
    };
  });

  // Calculate Exchange items if exchange
  let exchangeItems = [];
  let exchangeWeightSum = 0, exchangeKaratWeightSum = 0, exchangeTotal = 0;
  if(type === 'exchange'){
    exchangeItems = validExLines.map(ex => {
      const c = calcExchangeBuyLine(ex);
      exchangeWeightSum += c.weight;
      exchangeKaratWeightSum += c.karatWeight;
      exchangeTotal += c.amount;
      return {
        id: ex.id,
        itemName: ex.itemName || 'طلای کهنه',
        weight: ex.weight,
        weightRaw: ex.weightRaw,
        weightUnit: ex.weightUnit,
        karat: ex.karat,
        price18: ex.price18,
        amount: Math.round(c.amount)
      };
    });
  }

  const invDiscountFlat = currencyValue(document.getElementById('inv-discount'));
  const invDiscountPercent = Number(toEn((document.getElementById('inv-discount-percent') as HTMLInputElement)?.value || 0));

  let total = 0;
  let diffWeight18 = 0;
  let diffAmount = 0;

  if(type === 'exchange'){
    const grossDifference = subtotal - exchangeTotal;
    diffAmount = grossDifference;
    diffWeight18 = karatWeightSum - exchangeKaratWeightSum;
    const afterPercent = grossDifference > 0 ? (grossDifference * (1 - invDiscountPercent / 100)) : grossDifference;
    total = grossDifference > 0 ? Math.max(0, afterPercent - invDiscountFlat) : (afterPercent + invDiscountFlat);
  } else {
    const afterPercent = subtotal * (1 - invDiscountPercent / 100);
    total = Math.max(0, afterPercent - invDiscountFlat);
  }

  const invoiceDiscountSum = (type === 'exchange') ? Math.max(0, diffAmount - total) : (subtotal - total);

  // Validate Document Number and Invoice Number
  let docNum = parseInt(toEn((document.getElementById('inv-doc-num') as HTMLInputElement)?.value || ''), 10);
  if(isNaN(docNum) || docNum <= 0){
    docNum = getNextDocumentNumber();
  }
  if(docNum === 1){
    toast('شماره سند ۱ مختص سند افتتاحیه است و قابل تخصیص به فاکتور نیست', 'error');
    return;
  }
  if(isDocumentNumberDuplicate(docNum, editingInvoiceId || undefined, 'invoice')){
    toast(`شماره سند ${toFa(docNum)} تکراری است و قبلاً برای سند دیگری ثبت شده است`, 'error');
    return;
  }

  let invNum = parseInt(toEn((document.getElementById('inv-num') as HTMLInputElement)?.value || ''), 10);
  if(isNaN(invNum) || invNum <= 0){
    invNum = editingInvoiceId ? (db.invoices.find(x => x.id === editingInvoiceId)?.number || getNextInvoiceNumber()) : getNextInvoiceNumber();
  }

  let invoice;
  if(editingInvoiceId){
    invoice = db.invoices.find(x => x.id === editingInvoiceId);
    if(invoice){
      invoice.customerId = customerId;
      invoice.number = invNum;
      invoice.documentNumber = docNum;
      if(!invoice.permanentId || invoice.permanentId < 2){
        invoice.permanentId = getNextPermanentId();
      }
      invoice.type = type;
      invoice.accountMode = accountMode;
      invoice.items = items;
      invoice.exchangeItems = exchangeItems;
      invoice.total = Math.round(total);
      invoice.goldPriceSum = Math.round(goldPriceSum);
      invoice.wageSum = Math.round(wageSum);
      invoice.profitSum = Math.round(profitSum);
      invoice.taxSum = Math.round(taxSum);
      invoice.weightSum = weightSum;
      invoice.karatWeightSum = karatWeightSum;
      invoice.exchangeWeightSum = exchangeWeightSum;
      invoice.exchangeKaratWeightSum = exchangeKaratWeightSum;
      invoice.exchangeTotal = Math.round(exchangeTotal);
      invoice.diffWeight18 = diffWeight18;
      invoice.diffAmount = Math.round(diffAmount);
      invoice.discountSum = Math.round(lineDiscountSum + invoiceDiscountSum);
      invoice.invoiceDiscountFlat = invDiscountFlat;
      invoice.invoiceDiscountPercent = invDiscountPercent;
      invoice.note = note;
      invoice.date = sanadDate;
      invoice.updated_at = nowISO();
      invoice.is_synced = false;
    }
  } else {
    const permanentId = getNextPermanentId();
    invoice = {
      id: uuid(),
      permanentId,
      number: invNum,
      documentNumber: docNum,
      customerId,
      type,
      accountMode,
      items,
      exchangeItems,
      total: Math.round(total),
      goldPriceSum: Math.round(goldPriceSum),
      wageSum: Math.round(wageSum),
      profitSum: Math.round(profitSum),
      taxSum: Math.round(taxSum),
      weightSum,
      karatWeightSum,
      exchangeWeightSum,
      exchangeKaratWeightSum,
      exchangeTotal: Math.round(exchangeTotal),
      diffWeight18,
      diffAmount: Math.round(diffAmount),
      discountSum: Math.round(lineDiscountSum + invoiceDiscountSum),
      invoiceDiscountFlat: invDiscountFlat,
      invoiceDiscountPercent: invDiscountPercent,
      note,
      date: sanadDate,
      updated_at: nowISO(),
      is_synced: false
    };
    db.invoices.push(invoice);
  }
  persist('invoices');

  // Apply accounting ledger effects to customer
  const cust = db.customers.find(c => c.id === customerId);
  if(cust){
    if(accountMode === 'gold'){
      if(type === 'sell'){
        cust.goldBalance18 += karatWeightSum;
      } else if(type === 'buy'){
        cust.goldBalance18 -= karatWeightSum;
      } else if(type === 'exchange'){
        cust.goldBalance18 += diffWeight18;
      }
    } else {
      if(type === 'sell' || type === 'exchange'){
        cust.tomanBalance += invoice.total;
      } else {
        cust.tomanBalance -= invoice.total;
      }
    }
    cust.updated_at = nowISO();
    cust.is_synced = false;
  }

  // Apply immediate settlements (Cash, Bank, Check)
  if(!editingInvoiceId && invoiceSettlements.length > 0){
    let totalSettled = 0;
    invoiceSettlements.forEach(s => {
      const amt = Number(s.amount || 0);
      if(amt <= 0) return;
      totalSettled += amt;

      if(s.method === 'check'){
        if(!s.checkNumber) return;
        db.checks.push({
          id: uuid(),
          type: (type === 'sell' || type === 'exchange') ? 'received' : 'issued',
          number: s.checkNumber,
          bank: s.checkBank,
          dueDate: s.checkDueDate ? new Date(s.checkDueDate + 'T00:00:00').toISOString() : null,
          amount: amt,
          customerId,
          status: 'in_hand',
          note: `تسویه فاکتور #${invoice.number}`,
          invoiceId: invoice.id,
          updated_at: nowISO(),
          is_synced: false
        });
      } else {
        if(!s.accountId) return;
        db.financialTransactions.push({
          id: uuid(),
          kind: (type === 'sell' || type === 'exchange') ? 'deposit' : 'payment',
          method: s.method,
          accountId: s.accountId,
          checkId: null,
          amount: amt,
          date: sanadDate,
          customerId,
          invoiceId: invoice.id,
          note: `تسویه فاکتور #${invoice.number}`,
          updated_at: nowISO(),
          is_synced: false
        });
      }
    });

    // Reduce customer's debt by the amount immediately settled
    if(cust && accountMode === 'rial'){
      if(type === 'sell' || type === 'exchange'){
        cust.tomanBalance -= totalSettled;
      } else {
        cust.tomanBalance += totalSettled;
      }
      cust.updated_at = nowISO();
      cust.is_synced = false;
    }
    persist('checks');
    persist('financialTransactions');
    invoiceSettlements = [];
  }

  persist('customers');

  const wasEditing = !!editingInvoiceId;
  const typeText = type === 'exchange' ? 'تعویض طلا' : type === 'buy' ? 'خرید طلا' : 'فروش طلا';
  addLog(wasEditing
    ? `فاکتور ${typeText} #${invoice.number} ویرایش شد`
    : `فاکتور ${typeText} #${invoice.number} برای ${cust ? cust.name : '—'} ثبت شد`);
  toast(wasEditing ? 'فاکتور بروزرسانی شد' : 'فاکتور با موفقیت ثبت شد');
  editingInvoiceId = null;
  go('dashboard');
}

/* ============ reports ============ */
function renderReports(){
  const range = document.getElementById('report-range')?.value || 'all';
  const now = new Date();
  let cutoff = null;
  if(range === 'today') cutoff = new Date(now.toDateString());
  if(range === 'week') cutoff = new Date(now - 7*24*60*60*1000);
  if(range === 'month') cutoff = new Date(now - 30*24*60*60*1000);

  const filtered = db.invoices.filter(inv => !cutoff || new Date(inv.date) >= cutoff);

  let sales = 0, buys = 0, profit = 0, tax = 0, weightSell = 0, weightBuy = 0, discountTotal = 0;
  filtered.forEach(inv => {
    const p = inv.profitSum || 0, t = inv.taxSum || 0, w = inv.weightSum || 0;
    profit += p;
    tax += t;
    discountTotal += (inv.discountSum || 0);
    if(inv.type === 'sell'){
      sales += (inv.total || 0);
      weightSell += w;
    } else {
      buys += (inv.total || 0);
      weightBuy += w;
    }
  });

  document.getElementById('rep-count').textContent = toFa(filtered.length);
  document.getElementById('rep-sales').textContent = toFa(sales - buys) + ' ریال';
  document.getElementById('rep-sales-sub').textContent = `فروش: ${toFa(sales)} ریال — خرید: ${toFa(buys)} ریال — جمع تخفیفات: ${toFa(discountTotal)} ریال`;
  document.getElementById('rep-profit').textContent = toFa(profit) + ' ریال';
  document.getElementById('rep-tax').textContent = toFa(tax) + ' ریال';
  document.getElementById('rep-weight').textContent = toFa((weightSell - weightBuy).toFixed(3)) + ' گرم';

  const tbody = document.getElementById('reports-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('reports-empty').style.display = filtered.length ? 'none' : 'block';
  [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(inv => {
    const cust = db.customers.find(c => c.id === inv.customerId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>#${inv.number}</td>
      <td>${cust ? cust.name : '—'}</td>
      <td><span class="badge ${inv.type==='sell'?'badge-synced':'badge-pending'}">${inv.type==='sell'?'فروش':'خرید'}</span></td>
      <td>${toFa((inv.weightSum || 0).toFixed(3))} گرم</td>
      <td>${toFa(inv.total)} ریال</td>
      <td>${new Date(inv.date).toLocaleDateString('fa-IR')}</td>
      <td>${syncBadge(inv.is_synced)}</td>
      <td><button class="btn btn-sm" onclick="editInvoice('${inv.id}')">ویرایش</button></td>`;
    tbody.appendChild(tr);
  });
}

/* ============ finance: accounts, checks, transactions ============ */
function renderFinanceBadges(){
  const accEl = document.getElementById('sidetab-badge-fin-accounts');
  const chkEl = document.getElementById('sidetab-badge-fin-checks');
  const txnEl = document.getElementById('sidetab-badge-fin-transactions');
  if(accEl) accEl.textContent = toFa(db.financialAccounts?.length || 0);
  if(chkEl) chkEl.textContent = toFa(db.checks?.length || 0);
  if(txnEl) txnEl.textContent = toFa(db.financialTransactions?.length || 0);
}

let activeFinanceTab = 'accounts';

function switchFinanceTab(tab){
  activeFinanceTab = tab || 'accounts';
  document.querySelectorAll('.side-tab-item[data-fintab], .tab-btn[data-fintab]').forEach(b => b.classList.toggle('active', b.dataset.fintab === tab));
  document.querySelectorAll('#view-finance .finance-subview').forEach(v => v.classList.toggle('active', v.id === 'fintab-' + tab));
  
  const titleEl = document.getElementById('finance-main-title');
  const descEl = document.getElementById('finance-main-desc');
  if(titleEl && descEl){
    if(tab === 'accounts'){
      titleEl.textContent = 'حساب‌ها و صندوق‌ها (نقد و بانک)';
      descEl.textContent = 'موجودی و گردش حساب‌های بانکی و صندوق‌های فروشگاه';
    } else if(tab === 'checks'){
      titleEl.textContent = 'مدیریت و ثبت چک‌ها';
      descEl.textContent = 'دفتر چک‌های دریافتی از مشتریان و چک‌های پرداختی به همکاران';
    } else if(tab === 'transactions'){
      titleEl.textContent = 'واریز و برداشت (دریافت و پرداخت)';
      descEl.textContent = 'ثبت دریافت‌ها و پرداخت‌های نقدی، بانکی، حواله و پوز';
    }
  }

  renderFinanceBadges();
  if(tab === 'accounts') renderAccounts();
  if(tab === 'checks') renderChecks();
  if(tab === 'transactions') renderTransactions();
}
function renderFinance(){ 
  renderFinanceBadges();
  switchFinanceTab('accounts'); 
}

let editingAccountId = null;
function openAccountForm(id){
  editingAccountId = id || null;
  const overlay = document.getElementById('account-form-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  const saveBtn = document.getElementById('acc-save-btn');
  const titleEl = document.getElementById('account-form-title');
  if(editingAccountId){
    const a = db.financialAccounts.find(x => x.id === editingAccountId);
    if(a){
      if(titleEl) titleEl.textContent = `🏛️ ویرایش حساب / صندوق: ${a.name}`;
      const codeEl = document.getElementById('acc-code') as HTMLInputElement | null;
      if(codeEl) codeEl.value = a.code || nextAccountCode(a.type);
      document.getElementById('acc-type').value = a.type;
      document.getElementById('acc-name').value = a.name;
      document.getElementById('acc-initial-balance').value = fmtMoneyInput(a.initialBalance);
      document.getElementById('acc-bank-name').value = a.bankName || '';
      document.getElementById('acc-number').value = a.accountNumber || '';
    }
    if(saveBtn) saveBtn.textContent = 'بروزرسانی حساب';
  } else {
    if(titleEl) titleEl.textContent = '🏛️ تعریف حساب / صندوق جدید';
    document.getElementById('acc-type').value = 'bank';
    ['acc-code','acc-name','acc-initial-balance','acc-bank-name','acc-number'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });
    const codeEl = document.getElementById('acc-code') as HTMLInputElement | null;
    if(codeEl){
      codeEl.value = nextAccountCode('bank');
      codeEl.readOnly = true;
    }
    if(saveBtn) saveBtn.textContent = 'ذخیره حساب';
  }
  onAccountTypeChange();
  setTimeout(() => {
    const inp = document.getElementById('acc-name');
    if(inp) inp.focus();
  }, 50);
}

function closeAccountForm(){
  const overlay = document.getElementById('account-form-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  ['acc-code','acc-name','acc-initial-balance','acc-bank-name','acc-number'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  editingAccountId = null;
}

function onAccountTypeChange(){
  const isBank = document.getElementById('acc-type')?.value === 'bank';
  const fields = document.getElementById('acc-bank-fields');
  if(fields) fields.style.display = isBank ? 'grid' : 'none';
  if(!editingAccountId){
    const codeEl = document.getElementById('acc-code') as HTMLInputElement | null;
    if(codeEl && (!codeEl.value || codeEl.value === '101' || codeEl.value === '201')){
      codeEl.value = nextAccountCode(isBank ? 'bank' : 'cash');
    }
  }
}

function saveAccount(){
  const type = document.getElementById('acc-type').value;
  const codeInput = document.getElementById('acc-code') as HTMLInputElement | null;
  let code = toEn(codeInput ? codeInput.value.trim() : '');
  if(!code) code = nextAccountCode(type);

  const name = document.getElementById('acc-name').value.trim();
  const initialBalance = currencyValue(document.getElementById('acc-initial-balance'));
  const bankName = document.getElementById('acc-bank-name').value.trim();
  const accountNumber = document.getElementById('acc-number').value.trim();
  if(!name){ toast('نام حساب را وارد کنید'); return; }

  const dupCode = db.financialAccounts.find(a => a.id !== editingAccountId && toEn(String(a.code || '')).trim() === code);
  if(dupCode){ toast(`⚠️ کد حساب «${code}» قبلاً برای حساب «${dupCode.name}» استفاده شده است`, 'error'); return; }

  if(editingAccountId){
    const a = db.financialAccounts.find(x => x.id === editingAccountId);
    if(a){
      a.code = code; a.type = type; a.name = name; a.initialBalance = initialBalance; a.bankName = bankName; a.accountNumber = accountNumber;
      a.updated_at = nowISO(); a.is_synced = false;
      addLog(`حساب مالی ویرایش شد: ${name}`);
      toast('حساب بروزرسانی شد');
    }
  } else {
    db.financialAccounts.push({
      id: uuid(),
      code,
      type,
      name,
      initialBalance,
      bankName,
      accountNumber,
      updated_at: nowISO(),
      is_synced: false
    });
    addLog(`حساب مالی جدید ثبت شد: ${name}`);
    toast('حساب ذخیره شد');
  }
  persist('financialAccounts');
  closeAccountForm();
  renderAccounts();
}

function getAccountBalance(accountId){
  const acc = db.financialAccounts.find(a => a.id === accountId);
  if(!acc) return 0;
  let balance = Number(acc.initialBalance || 0);
  db.financialTransactions.forEach(t => {
    if(t.accountId !== accountId) return;
    balance += (t.kind === 'deposit') ? Number(t.amount || 0) : -Number(t.amount || 0);
  });
  if(db.expensesIncomes){
    db.expensesIncomes.forEach(ei => {
      if(ei.accountId !== accountId) return;
      if(ei.type === 'expense' || ei.type === 'income_return'){
        balance -= Number(ei.amount || 0);
      } else if(ei.type === 'income' || ei.type === 'expense_return'){
        balance += Number(ei.amount || 0);
      }
    });
  }
  return balance;
}

function renderAccounts(){
  renderFinanceBadges();
  const tbody = document.getElementById('accounts-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('accounts-empty').style.display = db.financialAccounts.length ? 'none' : 'block';
  let bankTotal = 0, cashTotal = 0;

  db.financialAccounts.forEach(a => {
    const bal = getAccountBalance(a.id);
    if(a.type === 'bank') bankTotal += bal; else cashTotal += bal;
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><span class="acc-code-badge">${toFa(a.code || '101')}</span></td>
      <td><b>${a.name}</b></td>
      <td><span class="badge ${a.type==='bank'?'badge-synced':'badge-pending'}">${a.type==='bank'?'بانک':'صندوق'}</span></td>
      <td style="color:var(--text-faint); font-size:11.5px;">${a.type==='bank' ? [a.bankName, a.accountNumber].filter(Boolean).join(' — ') || '—' : '—'}</td>
      <td class="${bal<0?'balance-neg':'balance-pos'}">${toFa(bal)} ریال</td>
      <td>${syncBadge(a.is_synced)}</td>
      <td><button class="btn btn-sm" onclick="openAccountForm('${a.id}')">ویرایش</button></td>`;
    tbody.appendChild(tr);
  });

  document.getElementById('stat-bank-total').textContent = toFa(bankTotal) + ' ریال';
  document.getElementById('stat-cash-total').textContent = toFa(cashTotal) + ' ریال';
  document.getElementById('stat-finance-total').textContent = toFa(bankTotal + cashTotal) + ' ریال';
}

/* --- checks --- */
let editingCheckId: string | null = null;
function openCheckForm(id?: string){
  editingCheckId = id || null;
  const overlay = document.getElementById('check-form-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  const saveBtn = document.getElementById('check-save-btn');
  const titleEl = document.getElementById('check-form-title');
  if(editingCheckId){
    const c = db.checks.find(x => x.id === editingCheckId);
    if(c){
      if(titleEl) titleEl.textContent = `📑 ویرایش چک شماره: ${c.number}`;
      const permEl = document.getElementById('check-perm-id') as HTMLInputElement | null;
      if(permEl) permEl.value = toFa(c.permanentId || 2) + ' (ثابت 🔒)';
      const docNumEl = document.getElementById('check-doc-num') as HTMLInputElement | null;
      if(docNumEl) docNumEl.value = String(c.documentNumber || 2);
      document.getElementById('check-type').value = c.type;
      document.getElementById('check-number').value = c.number;
      document.getElementById('check-bank').value = c.bank || '';
      document.getElementById('check-due-date').value = c.dueDate ? toDateInputValue(c.dueDate) : '';
      document.getElementById('check-amount').value = fmtMoneyInput(c.amount);
      document.getElementById('check-note').value = c.note || '';
      const cust = db.customers.find(x => x.id === c.customerId);
      document.getElementById('check-customer').value = c.customerId || '';
      document.getElementById('check-customer-display').value = cust ? cust.name : '';
    }
    if(saveBtn) saveBtn.textContent = 'بروزرسانی چک';
  } else {
    if(titleEl) titleEl.textContent = '📑 ثبت چک جدید';
    const permEl = document.getElementById('check-perm-id') as HTMLInputElement | null;
    if(permEl) permEl.value = toFa(getNextPermanentId()) + ' (تخصیص خودکار)';
    const docNumEl = document.getElementById('check-doc-num') as HTMLInputElement | null;
    if(docNumEl) docNumEl.value = String(getNextDocumentNumber());
    document.getElementById('check-type').value = 'received';
    ['check-number','check-bank','check-due-date','check-amount','check-note','check-customer-display'].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.value = '';
    });
    document.getElementById('check-customer').value = '';
    if(saveBtn) saveBtn.textContent = 'ذخیره چک';
  }
  setTimeout(() => {
    const inp = document.getElementById('check-number');
    if(inp) inp.focus();
  }, 50);
}
function closeCheckForm(){
  const overlay = document.getElementById('check-form-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  editingCheckId = null;
}

function saveCheck(){
  const type = document.getElementById('check-type').value;
  const number = document.getElementById('check-number').value.trim();
  const bank = document.getElementById('check-bank').value.trim();
  const dueDateVal = document.getElementById('check-due-date').value;
  const dueDate = dueDateVal ? new Date(dueDateVal + 'T00:00:00').toISOString() : null;
  const amount = currencyValue(document.getElementById('check-amount'));
  const customerId = document.getElementById('check-customer').value || null;
  const note = document.getElementById('check-note').value.trim();
  if(!number || !amount){ toast('شماره چک و مبلغ را وارد کنید'); return; }

  let docNum = parseInt(toEn((document.getElementById('check-doc-num') as HTMLInputElement)?.value || ''), 10);
  if(isNaN(docNum) || docNum <= 0){
    docNum = getNextDocumentNumber();
  }
  if(docNum === 1){
    toast('شماره سند ۱ مختص سند افتتاحیه است و قابل تغییر نیست', 'error');
    return;
  }
  if(isDocumentNumberDuplicate(docNum, editingCheckId || undefined, 'check')){
    toast(`شماره سند ${toFa(docNum)} تکراری است و قبلاً برای سند دیگری ثبت شده است`, 'error');
    return;
  }

  if(editingCheckId){
    const c = db.checks.find(x => x.id === editingCheckId);
    if(c){
      c.type = type; c.number = number; c.bank = bank; c.dueDate = dueDate; c.amount = amount; c.customerId = customerId; c.note = note;
      if(!c.permanentId || c.permanentId < 2) c.permanentId = getNextPermanentId();
      c.documentNumber = docNum;
      c.updated_at = nowISO(); c.is_synced = false;
      addLog(`چک ویرایش شد: ${number} با شماره سند #${docNum}`);
      toast('چک بروزرسانی شد');
    }
  } else {
    const permanentId = getNextPermanentId();
    db.checks.push({
      id: uuid(),
      permanentId,
      documentNumber: docNum,
      type,
      number,
      bank,
      dueDate,
      amount,
      customerId,
      status: 'in_hand',
      note,
      updated_at: nowISO(),
      is_synced: false
    });
    addLog(`چک جدید ثبت شد: ${number} با شماره سند #${docNum}`);
    toast('چک ذخیره شد');
  }
  persist('checks');
  closeCheckForm();
  renderChecks();
  renderVouchersTable();
}

function checkStatusLabel(status){
  if(status === 'cashed') return `<span class="badge badge-synced"><span class="dot"></span>وصول‌شده</span>`;
  if(status === 'bounced') return `<span class="badge" style="background:rgba(192,90,79,.15); color:var(--danger);"><span class="dot"></span>برگشت‌خورده</span>`;
  return `<span class="badge badge-pending"><span class="dot"></span>نزد ما</span>`;
}

function setCheckStatus(id, status){
  const c = db.checks.find(x => x.id === id);
  if(!c) return;
  c.status = status;
  c.updated_at = nowISO();
  c.is_synced = false;
  persist('checks');
  addLog(`وضعیت چک ${c.number} به «${status === 'cashed' ? 'وصول‌شده' : status === 'bounced' ? 'برگشت‌خورده' : 'نزد ما'}» تغییر یافت`);
  renderChecks();
}

function renderChecks(){
  const tbody = document.getElementById('checks-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('checks-empty').style.display = db.checks.length ? 'none' : 'block';
  [...db.checks].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).forEach(c => {
    const cust = db.customers.find(x => x.id === c.customerId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${c.number}</b></td>
      <td><span class="badge ${c.type==='received'?'badge-synced':'badge-pending'}">${c.type==='received'?'دریافتی':'پرداختی'}</span></td>
      <td style="color:var(--text-faint); font-size:11.5px;">${c.bank || '—'}</td>
      <td>${c.dueDate ? new Date(c.dueDate).toLocaleDateString('fa-IR') : '—'}</td>
      <td>${toFa(c.amount)} ریال</td>
      <td>${cust ? cust.name : '—'}</td>
      <td>${checkStatusLabel(c.status)}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm" onclick="openCheckForm('${c.id}')">ویرایش</button>
        ${c.status !== 'cashed' ? `<button class="btn btn-sm" onclick="setCheckStatus('${c.id}','cashed')">وصول شد</button>` : ''}
        ${c.status !== 'bounced' ? `<button class="btn btn-sm" onclick="setCheckStatus('${c.id}','bounced')">برگشت خورد</button>` : ''}
      </td>`;
    tbody.appendChild(tr);
  });
}

/* --- transactions (deposits/payments) --- */
function populateTxnAccountSelect(){
  const method = document.getElementById('txn-method').value;
  const kind = document.getElementById('txn-kind').value;
  const sel = document.getElementById('txn-account');
  const label = document.getElementById('txn-account-label');
  if(!sel || !label) return;

  if(method === 'check'){
    label.textContent = 'چک';
    const wantType = kind === 'deposit' ? 'received' : 'issued';
    const options = db.checks.filter(c => c.type === wantType && c.status === 'in_hand');
    sel.innerHTML = options.length
      ? options.map(c => `<option value="${c.id}">${c.number} — ${toFa(c.amount)} ریال${c.bank ? ' — ' + c.bank : ''}</option>`).join('')
      : `<option value="">— چکی نزد ما برای انتخاب موجود نیست —</option>`;
  } else {
    label.textContent = 'حساب';
    const options = db.financialAccounts.filter(a => a.type === method);
    sel.innerHTML = options.length
      ? options.map(a => `<option value="${a.id}">${a.name} (${toFa(getAccountBalance(a.id))} ریال)</option>`).join('')
      : `<option value="">— ابتدا حساب ${method === 'bank' ? 'بانک' : 'صندوق'} تعریف کنید —</option>`;
  }
}

let editingTxnId: string | null = null;
function openTxnForm(id?: string){
  editingTxnId = id || null;
  const overlay = document.getElementById('txn-form-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  const saveBtn = document.getElementById('txn-save-btn');
  const titleEl = document.getElementById('txn-form-title');

  if(editingTxnId){
    const t = (db.financialTransactions || []).find(x => x.id === editingTxnId);
    if(t){
      if(titleEl) titleEl.textContent = `💳 ویرایش تراکنش مالی (سند #${toFa(t.documentNumber || 2)})`;
      const permEl = document.getElementById('txn-perm-id') as HTMLInputElement | null;
      if(permEl) permEl.value = toFa(t.permanentId || 2) + ' (ثابت 🔒)';
      const docNumEl = document.getElementById('txn-doc-num') as HTMLInputElement | null;
      if(docNumEl) docNumEl.value = String(t.documentNumber || 2);
      document.getElementById('txn-kind').value = t.kind;
      document.getElementById('txn-method').value = t.method;
      populateTxnAccountSelect();
      document.getElementById('txn-account').value = (t.method !== 'check' ? t.accountId : t.checkId) || '';
      document.getElementById('txn-amount').value = fmtMoneyInput(t.amount);
      document.getElementById('txn-date').value = t.date ? toDateInputValue(t.date) : toDateInputValue(new Date());
      document.getElementById('txn-customer').value = t.customerId || '';
      const cust = db.customers.find(c => c.id === t.customerId);
      document.getElementById('txn-customer-display').value = cust ? cust.name : '';
      document.getElementById('txn-note').value = t.note || '';
    }
    if(saveBtn) saveBtn.textContent = 'بروزرسانی تراکنش';
  } else {
    if(titleEl) titleEl.textContent = '💳 ثبت تراکنش مالی (واریز / پرداخت)';
    const permEl = document.getElementById('txn-perm-id') as HTMLInputElement | null;
    if(permEl) permEl.value = toFa(getNextPermanentId()) + ' (تخصیص خودکار)';
    const docNumEl = document.getElementById('txn-doc-num') as HTMLInputElement | null;
    if(docNumEl) docNumEl.value = String(getNextDocumentNumber());
    document.getElementById('txn-kind').value = 'deposit';
    document.getElementById('txn-method').value = 'bank';
    document.getElementById('txn-amount').value = '';
    document.getElementById('txn-date').value = toDateInputValue(new Date());
    document.getElementById('txn-customer').value = '';
    document.getElementById('txn-customer-display').value = '';
    document.getElementById('txn-note').value = '';
    populateTxnAccountSelect();
    if(saveBtn) saveBtn.textContent = 'ثبت تراکنش';
  }
  setTimeout(() => {
    const inp = document.getElementById('txn-amount');
    if(inp) inp.focus();
  }, 50);
}

function closeTxnForm(){
  const overlay = document.getElementById('txn-form-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  editingTxnId = null;
}

function saveTransaction(){
  const kind = document.getElementById('txn-kind').value;
  const method = document.getElementById('txn-method').value;
  const refId = document.getElementById('txn-account').value;
  const amount = currencyValue(document.getElementById('txn-amount'));
  const dateVal = document.getElementById('txn-date').value;
  const customerId = document.getElementById('txn-customer').value || null;
  const note = document.getElementById('txn-note').value.trim();

  if(!refId){ toast('یک حساب یا چک انتخاب کنید'); return; }
  if(!amount){ toast('مبلغ تراکنش را وارد کنید'); return; }

  let docNum = parseInt(toEn((document.getElementById('txn-doc-num') as HTMLInputElement)?.value || ''), 10);
  if(isNaN(docNum) || docNum <= 0){
    docNum = getNextDocumentNumber();
  }
  if(docNum === 1){
    toast('شماره سند ۱ مختص سند افتتاحیه است و قابل تغییر نیست', 'error');
    return;
  }
  if(isDocumentNumberDuplicate(docNum, editingTxnId || undefined, 'transaction')){
    toast(`شماره سند ${toFa(docNum)} تکراری است و قبلاً برای سند دیگری ثبت شده است`, 'error');
    return;
  }

  const txnDate = dateVal ? new Date(dateVal + 'T00:00:00').toISOString() : nowISO();

  // If editing, reverse previous customer ledger adjustments
  if(editingTxnId){
    const oldTxn = (db.financialTransactions || []).find(x => x.id === editingTxnId);
    if(oldTxn && oldTxn.customerId){
      const oldCust = db.customers.find(c => c.id === oldTxn.customerId);
      if(oldCust){
        if(oldTxn.kind === 'deposit'){
          oldCust.tomanBalance += oldTxn.amount;
        } else {
          oldCust.tomanBalance -= oldTxn.amount;
        }
      }
    }
  }

  let txn;
  if(editingTxnId){
    txn = (db.financialTransactions || []).find(x => x.id === editingTxnId);
    if(txn){
      txn.kind = kind;
      txn.method = method;
      txn.accountId = method !== 'check' ? refId : null;
      txn.checkId = method === 'check' ? refId : null;
      txn.amount = amount;
      txn.date = txnDate;
      txn.customerId = customerId;
      txn.note = note;
      if(!txn.permanentId || txn.permanentId < 2) txn.permanentId = getNextPermanentId();
      txn.documentNumber = docNum;
      txn.updated_at = nowISO();
      txn.is_synced = false;
    }
  } else {
    const permanentId = getNextPermanentId();
    txn = {
      id: uuid(),
      permanentId,
      documentNumber: docNum,
      kind,
      method,
      accountId: method !== 'check' ? refId : null,
      checkId: method === 'check' ? refId : null,
      amount,
      date: txnDate,
      customerId,
      invoiceId: null,
      note,
      updated_at: nowISO(),
      is_synced: false
    };
    if(!db.financialTransactions) db.financialTransactions = [];
    db.financialTransactions.push(txn);
  }
  persist('financialTransactions');

  // Customer Ledger adjustment
  if(customerId){
    const cust = db.customers.find(c => c.id === customerId);
    if(cust){
      if(kind === 'deposit'){
        cust.tomanBalance -= amount; // We received money from customer -> Customer debt decreases
      } else {
        cust.tomanBalance += amount; // We paid money to customer -> Customer debt increases / credit decreases
      }
      cust.updated_at = nowISO();
      cust.is_synced = false;
      persist('customers');
    }
  }

  if(method === 'check'){
    const chk = db.checks.find(c => c.id === refId);
    if(chk){
      chk.status = 'cashed';
      chk.updated_at = nowISO();
      chk.is_synced = false;
      persist('checks');
    }
  }

  addLog(`تراکنش ${kind === 'deposit' ? 'دریافت وجه' : 'پرداخت وجه'} به مبلغ ${toFa(amount)} ریال با شماره سند #${docNum} ثبت شد`);
  toast('تراکنش ذخیره و سند بروزرسانی شد');
  closeTxnForm();
  renderTransactions();
  renderVouchersTable();
}

function transactionRefLabel(t){
  if(t.method === 'check'){
    const c = db.checks.find(x => x.id === t.checkId);
    return c ? `چک شماره ${c.number}` : '—';
  }
  const a = db.financialAccounts.find(x => x.id === t.accountId);
  return a ? a.name : '—';
}

function renderTransactions(){
  const tbody = document.getElementById('transactions-table');
  if(!tbody) return;
  tbody.innerHTML = '';
  document.getElementById('transactions-empty').style.display = db.financialTransactions.length ? 'none' : 'block';

  [...db.financialTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(t => {
    const cust = db.customers.find(c => c.id === t.customerId);
    const inv = t.invoiceId ? db.invoices.find(i => i.id === t.invoiceId) : null;
    const methodLabel = t.method === 'bank' ? 'بانک' : t.method === 'cash' ? 'صندوق' : 'چک';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${new Date(t.date).toLocaleDateString('fa-IR')}</td>
      <td><span class="badge ${t.kind==='deposit'?'badge-synced':'badge-pending'}">${t.kind==='deposit'?'دریافت / واریز':'پرداخت / خروج'}</span></td>
      <td>${methodLabel}</td>
      <td style="color:var(--text-faint); font-size:11.5px;">${transactionRefLabel(t)}</td>
      <td><b>${toFa(t.amount)} ریال</b></td>
      <td>${cust ? cust.name : '—'}</td>
      <td>${inv ? '#' + toFa(inv.number) : '—'}</td>
      <td style="color:var(--text-faint); font-size:11.5px;">${t.note || '—'}</td>`;
    tbody.appendChild(tr);
  });
}

/* ============ expense & income module ============ */
const DEFAULT_EXPENSE_CATEGORIES = [
  'اجاره و شارژ فروشگاه / پاساژ',
  'حقوق، دستمزد و پورسانت پرسنل',
  'کارمزد پوز و خدمات بانکی',
  'جعبه، پاکت و ملزومات بسته‌بندی طلا',
  'مخارج ریخته‌گری، آبکاری و تعمیرات متفرقه',
  'قبوض (برق، آب، گاز، تلفن و اینترنت)',
  'بیمه، حفاظت، دزدگیر و دوربین طلافروشی',
  'تبلیغات، عکاسی و پذیرایی مشتریان',
  'تعمیرات و نگهداری تجهیزات و ترازو',
  'سایر هزینه‌های جاری و متفرقه'
];

const DEFAULT_INCOME_CATEGORIES = [
  'درآمد خدمات تعمیرات و سایز کردن طلا',
  'درآمد آبکاری، جلا و شستشوی طلا',
  'کارمزد کارشناسی، ارزیابی و عیارسنجی طلا و سکه',
  'درآمد بازیافت، خاک شورکاری و ضایعات زرگری',
  'اجرت ساخت و خدمات سفارشی متفرقه',
  'سود بانکی، سرمایه‌گذاری و تسعیر',
  'سایر درآمدهای متفرقه و غیرعملیاتی'
];

let activeExpenseTab: 'expense' | 'income' = 'expense';
let activeExpenseSubView: 'list' | 'accounts' = 'list';
let editingExpenseId: string | null = null;

function getExpenseCategories(type: string){
  const isExp = type === 'expense' || type === 'expense_return';
  const defaults = isExp ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const custom = (db.customCategories && db.customCategories[isExp ? 'expense' : 'income']) || [];
  return Array.from(new Set([...defaults, ...custom]));
}

let expenseActiveCategoryFilter: string | null = null;

function populateExpenseCategoryFilterSelect(){
  const selectEl = document.getElementById('expinc-filter-category') as HTMLSelectElement | null;
  if(!selectEl) return;
  const isExp = activeExpenseTab === 'expense';
  const cats = getExpenseCategories(isExp ? 'expense' : 'income');

  let items = db.expensesIncomes || [];
  items = items.filter(x => isExp ? (x.type === 'expense' || x.type === 'expense_return') : (x.type === 'income' || x.type === 'income_return'));
  const totalCount = items.length;

  let optionsHtml = `<option value="all">همه سرفصل‌ها (${toFa(totalCount)})</option>`;
  cats.forEach(c => {
    const count = items.filter(x => x.category === c).length;
    optionsHtml += `<option value="${escapeHtml(c)}">${escapeHtml(c)} (${toFa(count)})</option>`;
  });
  selectEl.innerHTML = optionsHtml;
  selectEl.value = expenseActiveCategoryFilter || 'all';
}

function onExpenseCategoryFilterChange(val: string){
  const catName = (val === 'all' || !val) ? null : val;
  filterExpensesByCategory(catName);
}

function filterExpensesByCategory(categoryName: string | null){
  expenseActiveCategoryFilter = categoryName;
  const selectEl = document.getElementById('expinc-filter-category') as HTMLSelectElement | null;
  if(selectEl) selectEl.value = categoryName || 'all';
  renderExpensesIncomesTable();
}

function setExpenseSubView(subView: 'list' | 'accounts'){
  activeExpenseSubView = subView;
  switchExpenseIncomeTab(activeExpenseTab, subView);
}

function switchExpenseIncomeTab(tab: 'expense' | 'income' = 'expense', subView: 'list' | 'accounts' = 'list'){
  activeExpenseTab = tab === 'income' ? 'income' : 'expense';
  activeExpenseSubView = subView || 'list';
  expenseActiveCategoryFilter = null;

  const titleEl = document.getElementById('exp-main-title');
  const descEl = document.getElementById('exp-main-desc');
  const actionsEl = document.getElementById('exp-header-actions');
  const subtabListBtn = document.getElementById('exp-subtab-btn-list');
  const subtabAccBtn = document.getElementById('exp-subtab-btn-accounts');
  const listView = document.getElementById('exptab-list-view');
  const catView = document.getElementById('exptab-categories-view');

  if(activeExpenseTab === 'expense'){
    if(titleEl) titleEl.textContent = 'هزینه‌های فروشگاه';
    if(descEl) descEl.textContent = activeExpenseSubView === 'accounts' ? 'مدیریت حساب‌ها و سرفصل‌های معین هزینه (گروه ۶)' : 'ثبت و مدیریت انواع هزینه‌های جاری و ملزومات فروشگاه';
    if(subtabListBtn){
      subtabListBtn.textContent = '📋 اسناد هزینه';
      subtabListBtn.classList.toggle('active', activeExpenseSubView === 'list');
    }
    if(subtabAccBtn){
      subtabAccBtn.textContent = '🏛️ حساب‌های هزینه';
      subtabAccBtn.classList.toggle('active', activeExpenseSubView === 'accounts');
    }
    if(actionsEl){
      if(activeExpenseSubView === 'list'){
        actionsEl.innerHTML = `
          <button class="btn btn-gold" onclick="openExpenseIncomeForm('expense')">+ ثبت هزینه</button>
          <button class="btn btn-sm btn-ghost-pill" onclick="openExpenseIncomeForm('expense_return')">🔄 برگشت هزینه</button>
        `;
      } else {
        actionsEl.innerHTML = `
          <button class="btn btn-gold" onclick="promptAddCurrentCategory()">+ افزودن حساب هزینه</button>
        `;
      }
    }
  } else {
    // income
    if(titleEl) titleEl.textContent = 'درآمدهای متفرقه و خدمات';
    if(descEl) descEl.textContent = activeExpenseSubView === 'accounts' ? 'مدیریت حساب‌ها و سرفصل‌های معین درآمد (گروه ۴)' : 'درآمد حاصل از تعمیرات، خدمات زرگری، کارمزدها و درآمدهای غیرعملیاتی';
    if(subtabListBtn){
      subtabListBtn.textContent = '📋 اسناد درآمد';
      subtabListBtn.classList.toggle('active', activeExpenseSubView === 'list');
    }
    if(subtabAccBtn){
      subtabAccBtn.textContent = '🏛️ حساب‌های درآمد';
      subtabAccBtn.classList.toggle('active', activeExpenseSubView === 'accounts');
    }
    if(actionsEl){
      if(activeExpenseSubView === 'list'){
        actionsEl.innerHTML = `
          <button class="btn btn-gold" style="background:#22c55e; border-color:#22c55e;" onclick="openExpenseIncomeForm('income')">+ ثبت درآمد</button>
          <button class="btn btn-sm btn-ghost-pill" onclick="openExpenseIncomeForm('income_return')">🔄 برگشت درآمد</button>
        `;
      } else {
        actionsEl.innerHTML = `
          <button class="btn btn-gold" style="background:#22c55e; border-color:#22c55e;" onclick="promptAddCurrentCategory()">+ افزودن حساب درآمد</button>
        `;
      }
    }
  }

  if(activeExpenseSubView === 'accounts'){
    if(listView) listView.style.display = 'none';
    if(catView) catView.style.display = 'block';
    renderSingleExpenseCategoryView(activeExpenseTab);
  } else {
    if(listView) listView.style.display = 'block';
    if(catView) catView.style.display = 'none';
    populateExpenseCategoryFilterSelect();
    renderExpensesIncomesTable();
  }

  renderExpenseStats();
}

function renderExpenses(){
  switchExpenseIncomeTab(activeExpenseTab || 'expense', activeExpenseSubView || 'list');
}

function renderSingleExpenseCategoryView(tab: 'expense' | 'income'){
  const tbody = document.getElementById('single-category-table-body');
  const titleEl = document.getElementById('exp-category-view-title');
  const descEl = document.getElementById('exp-category-view-desc');
  const addBtn = document.getElementById('exp-category-add-btn');
  if(!tbody) return;
  tbody.innerHTML = '';

  const isExp = tab === 'expense';
  if(titleEl) titleEl.textContent = isExp ? 'سرفصل‌ها و حساب‌های هزینه (گروه ۶ حسابداری)' : 'سرفصل‌ها و حساب‌های درآمد (گروه ۴ حسابداری)';
  if(descEl) descEl.textContent = isExp ? 'حساب‌های معین استاندارد جهت تفکیک مخارج فروشگاه و صدور اسناد' : 'حساب‌های معین جهت تفکیک درآمدهای متفرقه، خدمات، آبکاری و تعمیرات';
  if(addBtn) {
    addBtn.textContent = isExp ? '+ افزودن حساب هزینه' : '+ افزودن حساب درآمد';
    addBtn.style.background = isExp ? '' : '#22c55e';
    addBtn.style.borderColor = isExp ? '' : '#22c55e';
  }

  const cats = getExpenseCategories(tab);
  const allItems = db.expensesIncomes || [];
  const customList = (db.customCategories && db.customCategories[isExp ? 'expense' : 'income']) || [];

  cats.forEach((cat, idx) => {
    const code = `${isExp ? '6.01' : '4.01'}.${String(idx + 1).padStart(3, '0')}`;
    const catItems = allItems.filter(x => (isExp ? (x.type === 'expense' || x.type === 'expense_return') : (x.type === 'income' || x.type === 'income_return')) && x.category === cat);
    const sum = catItems.reduce((acc, x) => {
      if(isExp) return acc + (x.type === 'expense' ? x.amount : -x.amount);
      return acc + (x.type === 'income' ? x.amount : -x.amount);
    }, 0);
    const isCustom = customList.includes(cat);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="text-align:center; font-family:monospace; font-weight:700; color:var(--text-faint);">${toFa(code)}</td>
      <td>
        <div style="font-weight:700; color:var(--text);">${escapeHtml(cat)}</div>
        <div class="stat-sub">${isExp ? 'سرفصل هزینه جاری (ماهیت بدهکار)' : 'سرفصل درآمد متفرقه (ماهیت بستانکار)'}</div>
      </td>
      <td style="text-align:center;"><b>${toFa(catItems.length)}</b> سند</td>
      <td style="font-weight:700; ${isExp ? 'color:#f28b82;' : 'color:var(--success);'}">${toFa(Math.max(0, sum))} ریال</td>
      <td style="text-align:center;">
        ${isCustom ? `<button class="btn btn-sm" style="color:var(--danger);" onclick="deleteExpenseCategory('${tab}', '${escapeForJs(cat)}')">حذف</button>` : `<span style="color:var(--text-faint); font-size:11px;">سیستمی</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function promptAddCurrentCategory(){
  const isExp = activeExpenseTab === 'expense';
  const typeLabel = isExp ? 'هزینه' : 'درآمد';
  showPromptModal({
    title: `افزودن حساب / سرفصل ${typeLabel}`,
    message: `نام سرفصل یا حساب جدید ${typeLabel} را وارد کنید:`,
    placeholder: isExp ? 'مثلاً: هزینه بسته‌بندی، تبلیغات، استهلاک...' : 'مثلاً: درآمد ارزیابی، اجرت سایز کردن، خدمات خاص...',
    confirmText: 'ثبت و ذخیره حساب',
    onConfirm: (trimmed) => {
      if(!trimmed) return;
      const key = isExp ? 'expense' : 'income';
      if(!db.customCategories) db.customCategories = { expense: [], income: [] };
      if(!db.customCategories[key]) db.customCategories[key] = [];
      if(!db.customCategories[key].includes(trimmed)){
        db.customCategories[key].push(trimmed);
        persist('customCategories');
        toast(`حساب «${trimmed}» با موفقیت افزوده شد`, 'success');
        renderSingleExpenseCategoryView(activeExpenseTab);
        populateExpenseCategoryFilterSelect();
      } else {
        toast('این سرفصل قبلاً در لیست وجود دارد', 'error');
      }
    }
  });
}

function promptAddExpenseCategory(){
  promptAddCurrentCategory();
}

function deleteExpenseCategory(tab: 'expense' | 'income', cat: string){
  showConfirmModal({
    title: `حذف سرفصل ${cat}`,
    message: `آیا از حذف سرفصل «${cat}» اطمینان دارید؟`,
    isDanger: true,
    confirmText: 'بله، حذف شود',
    cancelText: 'انصراف',
    onConfirm: () => {
      const key = tab === 'expense' ? 'expense' : 'income';
      if(db.customCategories && db.customCategories[key]){
        db.customCategories[key] = db.customCategories[key].filter(x => x !== cat);
        persist('customCategories');
        toast(`سرفصل «${cat}» حذف شد`, 'success');
        renderSingleExpenseCategoryView(activeExpenseTab);
        populateExpenseCategoryFilterSelect();
      }
    }
  });
}

function renderExpenseStats(){
  let expTotal = 0, incTotal = 0;
  let expCount = 0, incCount = 0;
  const items = db.expensesIncomes || [];
  items.forEach(item => {
    const amt = Number(item.amount || 0);
    if(item.type === 'expense'){ expTotal += amt; expCount++; }
    else if(item.type === 'expense_return'){ expTotal -= amt; expCount++; }
    else if(item.type === 'income'){ incTotal += amt; incCount++; }
    else if(item.type === 'income_return'){ incTotal -= amt; incCount++; }
  });

  const isExp = activeExpenseTab === 'expense';
  const totalLabelEl = document.getElementById('exp-stat-total-label');
  const totalValEl = document.getElementById('stat-exp-total');
  const totalSubEl = document.getElementById('stat-exp-sub');
  const countLabelEl = document.getElementById('exp-stat-count-label');
  const countValEl = document.getElementById('stat-expinc-count');
  const countSubEl = document.getElementById('stat-expinc-count-sub');

  if(isExp){
    if(totalLabelEl) totalLabelEl.textContent = 'جمع کل هزینه‌ها (خالص)';
    if(totalValEl){
      totalValEl.textContent = toFa(Math.max(0, expTotal)) + ' ریال';
      totalValEl.style.color = '#f28b82';
    }
    if(totalSubEl) totalSubEl.textContent = 'مجموع هزینه‌ها منهای برگشت هزینه';
    if(countLabelEl) countLabelEl.textContent = 'تعداد اسناد هزینه';
    if(countValEl) countValEl.textContent = toFa(expCount);
    if(countSubEl) countSubEl.textContent = 'اسناد ثبت‌شده هزینه فروشگاه';
  } else {
    if(totalLabelEl) totalLabelEl.textContent = 'جمع کل درآمدهای متفرقه (خالص)';
    if(totalValEl){
      totalValEl.textContent = toFa(Math.max(0, incTotal)) + ' ریال';
      totalValEl.style.color = 'var(--success)';
    }
    if(totalSubEl) totalSubEl.textContent = 'درآمدها منهای برگشت درآمد';
    if(countLabelEl) countLabelEl.textContent = 'تعداد اسناد درآمد';
    if(countValEl) countValEl.textContent = toFa(incCount);
    if(countSubEl) countSubEl.textContent = 'اسناد ثبت‌شده درآمدهای متفرقه';
  }
}

function populateExpenseIncomeCategorySelect(type, selectedVal){
  const sel = document.getElementById('expinc-category') as HTMLSelectElement | null;
  if(!sel) return;
  const cats = getExpenseCategories(type);
  sel.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}" ${c===selectedVal?'selected':''}>${escapeHtml(c)}</option>`).join('')
    + `<option value="__new__">+ افزودن سرفصل جدید...</option>`;
}

function populateExpenseIncomeTypeSelect(targetType: string){
  const typeSelect = document.getElementById('expinc-type') as HTMLSelectElement | null;
  if(!typeSelect) return;
  const isExp = targetType === 'expense' || targetType === 'expense_return';
  if(isExp){
    typeSelect.innerHTML = `
      <option value="expense">🔴 ثبت هزینه (خروج وجه / مخارج فروشگاه)</option>
      <option value="expense_return">🔄 برگشت هزینه (استرداد وجه هزینه)</option>
    `;
    typeSelect.value = targetType === 'expense_return' ? 'expense_return' : 'expense';
  } else {
    typeSelect.innerHTML = `
      <option value="income">🟢 ثبت درآمد (ورود وجه / خدمات و...)</option>
      <option value="income_return">🔄 برگشت درآمد (استرداد وجه به مشتری)</option>
    `;
    typeSelect.value = targetType === 'income_return' ? 'income_return' : 'income';
  }
}

function populateExpenseIncomeAccountSelect(method, selectedId){
  const sel = document.getElementById('expinc-account') as HTMLSelectElement | null;
  const field = document.getElementById('expinc-account-field');
  const label = document.getElementById('expinc-account-label');
  if(!sel || !field || !label) return;

  if(method === 'credit' || method === 'check'){
    field.style.display = 'none';
    return;
  }
  field.style.display = 'block';
  label.textContent = method === 'bank' ? 'حساب بانک' : 'صندوق فروشگاه';
  const options = db.financialAccounts.filter(a => a.type === method);
  if(options.length){
    sel.innerHTML = options.map(a => `<option value="${a.id}" ${a.id===selectedId?'selected':''}>${a.name} (${toFa(getAccountBalance(a.id))} ریال)</option>`).join('');
  } else {
    sel.innerHTML = `<option value="">— ابتدا حساب ${method==='bank'?'بانک':'صندوق'} تعریف کنید —</option>`;
  }
}

function onExpenseIncomeTypeChange(){
  const type = (document.getElementById('expinc-type') as HTMLSelectElement)?.value || 'expense';
  const formTitle = document.getElementById('expinc-form-title');
  if(formTitle){
    if(type === 'expense') formTitle.textContent = '🔴 ثبت هزینه جدید (خروج وجه)';
    else if(type === 'expense_return') formTitle.textContent = '🔄 ثبت برگشت هزینه (دریافت وجه استردادی)';
    else if(type === 'income') formTitle.textContent = '🟢 ثبت درآمد جدید (ورود وجه)';
    else if(type === 'income_return') formTitle.textContent = '🔄 ثبت برگشت درآمد (استرداد وجه به مشتری)';
  }
  populateExpenseIncomeCategorySelect(type);
}

function onExpenseIncomePaymentMethodChange(){
  const method = (document.getElementById('expinc-payment-method') as HTMLSelectElement)?.value || 'bank';
  populateExpenseIncomeAccountSelect(method);
}

function openExpenseIncomeForm(type?: string, id?: string | null){
  editingExpenseId = id || null;
  const overlay = document.getElementById('expense-income-modal-overlay');
  if(overlay) overlay.style.display = 'flex';
  const saveBtn = document.getElementById('expinc-save-btn');

  let chosenType = type || (activeExpenseTab === 'income' ? 'income' : 'expense');

  if(editingExpenseId){
    const item = (db.expensesIncomes || []).find(x => x.id === editingExpenseId);
    if(item){
      chosenType = item.type;
      populateExpenseIncomeTypeSelect(chosenType);
      const permEl = document.getElementById('expinc-perm-id') as HTMLInputElement | null;
      if(permEl) permEl.value = String(item.permanentId || 2);
      const docNumEl = document.getElementById('expinc-doc-num') as HTMLInputElement | null;
      if(docNumEl) docNumEl.value = String(item.documentNumber || 2);
      (document.getElementById('expinc-type') as HTMLSelectElement).value = item.type;
      populateExpenseIncomeCategorySelect(item.type, item.category);
      (document.getElementById('expinc-category') as HTMLSelectElement).value = item.category || '';
      (document.getElementById('expinc-title') as HTMLInputElement).value = item.title || '';
      (document.getElementById('expinc-amount') as HTMLInputElement).value = fmtMoneyInput(item.amount);
      (document.getElementById('expinc-date') as HTMLInputElement).value = item.date ? toDateInputValue(item.date) : toDateInputValue(new Date());
      (document.getElementById('expinc-payment-method') as HTMLSelectElement).value = item.paymentMethod || 'bank';
      populateExpenseIncomeAccountSelect(item.paymentMethod || 'bank', item.accountId);
      (document.getElementById('expinc-customer') as HTMLInputElement).value = item.customerId || '';
      const cust = db.customers.find(c => c.id === item.customerId);
      (document.getElementById('expinc-customer-display') as HTMLInputElement).value = cust ? cust.name : '';
      (document.getElementById('expinc-tracking-code') as HTMLInputElement).value = item.trackingCode || '';
      (document.getElementById('expinc-note') as HTMLInputElement).value = item.note || '';
    }
    if(saveBtn) saveBtn.textContent = 'بروزرسانی سند';
  } else {
    populateExpenseIncomeTypeSelect(chosenType);
    const permEl = document.getElementById('expinc-perm-id') as HTMLInputElement | null;
    if(permEl) permEl.value = String(getNextPermanentId());
    const docNumEl = document.getElementById('expinc-doc-num') as HTMLInputElement | null;
    if(docNumEl) docNumEl.value = String(getNextDocumentNumber());
    (document.getElementById('expinc-type') as HTMLSelectElement).value = chosenType;
    populateExpenseIncomeCategorySelect(chosenType);
    (document.getElementById('expinc-title') as HTMLInputElement).value = '';
    (document.getElementById('expinc-amount') as HTMLInputElement).value = '';
    (document.getElementById('expinc-date') as HTMLInputElement).value = toDateInputValue(new Date());
    (document.getElementById('expinc-payment-method') as HTMLSelectElement).value = 'bank';
    populateExpenseIncomeAccountSelect('bank');
    (document.getElementById('expinc-customer') as HTMLInputElement).value = '';
    (document.getElementById('expinc-customer-display') as HTMLInputElement).value = '';
    (document.getElementById('expinc-tracking-code') as HTMLInputElement).value = '';
    (document.getElementById('expinc-note') as HTMLInputElement).value = '';
    if(saveBtn) saveBtn.textContent = 'ذخیره سند';
  }
  onExpenseIncomeTypeChange();
  setTimeout(() => {
    const inp = document.getElementById('expinc-title');
    if(inp) inp.focus();
  }, 50);
}

function closeExpenseIncomeForm(){
  const overlay = document.getElementById('expense-income-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  editingExpenseId = null;
}

function saveExpenseIncome(){
  const type = document.getElementById('expinc-type').value;
  let category = document.getElementById('expinc-category').value;
  if(category === '__new__'){
    const newCat = prompt('نام سرفصل یا دسته‌بندی جدید را وارد کنید:');
    if(!newCat || !newCat.trim()){
      toast('افزودن سرفصل لغو شد');
      return;
    }
    category = newCat.trim();
    const isExp = type === 'expense' || type === 'expense_return';
    if(!db.customCategories) db.customCategories = { expense: [], income: [] };
    if(!db.customCategories[isExp ? 'expense' : 'income']) db.customCategories[isExp ? 'expense' : 'income'] = [];
    db.customCategories[isExp ? 'expense' : 'income'].push(category);
    persist('customCategories');
    populateExpenseIncomeCategorySelect(type, category);
  }

  const title = document.getElementById('expinc-title').value.trim();
  const amount = currencyValue(document.getElementById('expinc-amount'));
  const dateVal = document.getElementById('expinc-date').value;
  const paymentMethod = document.getElementById('expinc-payment-method').value;
  const accountId = (paymentMethod === 'bank' || paymentMethod === 'cash') ? document.getElementById('expinc-account').value : null;
  const customerId = document.getElementById('expinc-customer').value || null;
  const trackingCode = document.getElementById('expinc-tracking-code').value.trim();
  const note = document.getElementById('expinc-note').value.trim();

  if(!title){ toast('عنوان سند را وارد کنید'); return; }
  if(!amount || amount <= 0){ toast('مبلغ معتبر وارد کنید'); return; }
  if((paymentMethod === 'bank' || paymentMethod === 'cash') && !accountId){
    toast(`لطفاً یک حساب ${paymentMethod==='bank'?'بانکی':'صندوق'} انتخاب کنید`);
    return;
  }

  let docNum = parseInt(toEn((document.getElementById('expinc-doc-num') as HTMLInputElement)?.value || ''), 10);
  if(isNaN(docNum) || docNum <= 0){
    docNum = getNextDocumentNumber();
  }
  if(docNum === 1){
    toast('شماره سند ۱ مختص سند افتتاحیه است و قابل تغییر نیست', 'error');
    return;
  }
  if(isDocumentNumberDuplicate(docNum, editingExpenseId || undefined, 'expense')){
    toast(`شماره سند ${toFa(docNum)} تکراری است و قبلاً برای سند دیگری ثبت شده است`, 'error');
    return;
  }

  const sanadDate = dateVal ? new Date(dateVal + 'T00:00:00').toISOString() : nowISO();

  // If editing, reverse previous ledger effects
  if(editingExpenseId){
    const oldItem = (db.expensesIncomes || []).find(x => x.id === editingExpenseId);
    if(oldItem){
      if(oldItem.customerId && oldItem.paymentMethod === 'credit'){
        const oldCust = db.customers.find(c => c.id === oldItem.customerId);
        if(oldCust){
          if(oldItem.type === 'expense') oldCust.tomanBalance += oldItem.amount;
          else if(oldItem.type === 'expense_return') oldCust.tomanBalance -= oldItem.amount;
          else if(oldItem.type === 'income') oldCust.tomanBalance -= oldItem.amount;
          else if(oldItem.type === 'income_return') oldCust.tomanBalance += oldItem.amount;
        }
      }
    }
  }

  let item;
  if(editingExpenseId){
    item = (db.expensesIncomes || []).find(x => x.id === editingExpenseId);
    if(item){
      item.type = type;
      item.category = category;
      item.title = title;
      item.amount = amount;
      item.date = sanadDate;
      item.paymentMethod = paymentMethod;
      item.accountId = accountId;
      item.customerId = customerId;
      item.trackingCode = trackingCode;
      item.note = note;
      if(!item.permanentId || item.permanentId < 2) item.permanentId = getNextPermanentId();
      item.documentNumber = docNum;
      item.updated_at = nowISO();
      item.is_synced = false;
    }
  } else {
    const permanentId = getNextPermanentId();
    item = {
      id: uuid(),
      permanentId,
      documentNumber: docNum,
      type,
      category,
      title,
      amount,
      date: sanadDate,
      paymentMethod,
      accountId,
      customerId,
      trackingCode,
      note,
      updated_at: nowISO(),
      is_synced: false
    };
    if(!db.expensesIncomes) db.expensesIncomes = [];
    db.expensesIncomes.push(item);
  }

  // Apply customer ledger adjustment if credit
  if(customerId && paymentMethod === 'credit'){
    const cust = db.customers.find(c => c.id === customerId);
    if(cust){
      if(type === 'expense') cust.tomanBalance -= amount; // We owe them -> negative credit
      else if(type === 'expense_return') cust.tomanBalance += amount;
      else if(type === 'income') cust.tomanBalance += amount; // They owe us -> positive debit
      else if(type === 'income_return') cust.tomanBalance -= amount;
      cust.updated_at = nowISO();
      cust.is_synced = false;
      persist('customers');
    }
  }

  // If check, create a check entry automatically
  if(paymentMethod === 'check' && !editingExpenseId){
    db.checks.push({
      id: uuid(),
      type: (type === 'expense' || type === 'income_return') ? 'issued' : 'received',
      number: trackingCode || ('چک-' + item.documentNumber),
      bank: 'بانک طرف حساب',
      dueDate: sanadDate,
      amount: amount,
      customerId: customerId,
      status: 'in_hand',
      note: `سند ${typeLabel(type)} #${item.documentNumber}: ${title}`,
      updated_at: nowISO(),
      is_synced: false
    });
    persist('checks');
  }

  persist('expensesIncomes');
  addLog(`سند ${typeLabel(type)} #${item.documentNumber} به مبلغ ${toFa(amount)} ریال ثبت شد: ${title}`);
  toast(editingExpenseId ? 'سند با موفقیت بروزرسانی شد' : 'سند مالی با موفقیت ثبت شد');
  closeExpenseIncomeForm();
  renderExpenses();
  renderAccounts();
}

function deleteExpenseIncome(id){
  const item = (db.expensesIncomes || []).find(x => x.id === id);
  if(!item) return;
  showConfirmModal({
    title: `حذف سند شماره #${item.documentNumber}`,
    message: `آیا از حذف سند #${item.documentNumber} (${item.title}) به مبلغ ${toFa(item.amount)} ریال اطمینان دارید؟`,
    isDanger: true,
    confirmText: 'بله، حذف شود',
    cancelText: 'انصراف',
    onConfirm: () => {
      // Revert customer credit if applicable
      if(item.customerId && item.paymentMethod === 'credit'){
        const cust = db.customers.find(c => c.id === item.customerId);
        if(cust){
          if(item.type === 'expense') cust.tomanBalance += item.amount;
          else if(item.type === 'expense_return') cust.tomanBalance -= item.amount;
          else if(item.type === 'income') cust.tomanBalance -= item.amount;
          else if(item.type === 'income_return') cust.tomanBalance += item.amount;
          cust.updated_at = nowISO();
          cust.is_synced = false;
          persist('customers');
        }
      }

      db.expensesIncomes = db.expensesIncomes.filter(x => x.id !== id);
      persist('expensesIncomes');
      addLog(`سند #${item.documentNumber} (${item.title}) حذف شد`);
      toast('سند مالی حذف شد', 'success');
      renderExpenses();
      renderAccounts();
      renderVouchersTable();
    }
  });
}

function typeLabel(type){
  if(type === 'expense') return 'هزینه';
  if(type === 'expense_return') return 'برگشت هزینه';
  if(type === 'income') return 'درآمد';
  if(type === 'income_return') return 'برگشت درآمد';
  return 'متفرقه';
}

function typeBadgeHtml(type){
  if(type === 'expense') return `<span class="badge badge-expense"><span class="dot"></span>هزینه</span>`;
  if(type === 'expense_return') return `<span class="badge badge-expense-return"><span class="dot"></span>برگشت هزینه</span>`;
  if(type === 'income') return `<span class="badge badge-income"><span class="dot"></span>درآمد</span>`;
  if(type === 'income_return') return `<span class="badge badge-income-return"><span class="dot"></span>برگشت درآمد</span>`;
  return `<span class="badge"><span class="dot"></span>سند</span>`;
}

function methodLabel(method, accountId){
  if(method === 'credit') return 'نسیه / حساب شخص';
  if(method === 'check') return 'چک بانکی';
  const a = db.financialAccounts.find(x => x.id === accountId);
  if(method === 'bank') return a ? `بانک: ${a.name}` : 'بانک';
  if(method === 'cash') return a ? `صندوق: ${a.name}` : 'صندوق';
  return 'نقدی';
}

function renderExpensesIncomesTable(){
  const tbody = document.getElementById('expenses-table');
  if(!tbody) return;
  tbody.innerHTML = '';

  const search = toEn(document.getElementById('expinc-search')?.value || '').toLowerCase().trim();
  const range = document.getElementById('expinc-filter-range')?.value || 'all';
  const methodFilter = document.getElementById('expinc-filter-method')?.value || 'all';

  const now = new Date();
  let cutoff = null;
  if(range === 'today') cutoff = new Date(now.toDateString());
  if(range === 'week') cutoff = new Date(now - 7*24*60*60*1000);
  if(range === 'month') cutoff = new Date(now - 30*24*60*60*1000);

  let list = db.expensesIncomes || [];
  if(activeExpenseTab === 'expense'){
    list = list.filter(x => x.type === 'expense' || x.type === 'expense_return');
  } else if(activeExpenseTab === 'income'){
    list = list.filter(x => x.type === 'income' || x.type === 'income_return');
  }
  if(expenseActiveCategoryFilter){
    list = list.filter(x => x.category === expenseActiveCategoryFilter);
  }
  if(cutoff){
    list = list.filter(x => new Date(x.date) >= cutoff);
  }
  if(methodFilter !== 'all'){
    list = list.filter(x => x.paymentMethod === methodFilter);
  }
  if(search){
    list = list.filter(x => {
      const cust = db.customers.find(c => c.id === x.customerId);
      const custName = cust ? cust.name.toLowerCase() : '';
      return (x.title && x.title.toLowerCase().includes(search)) ||
             (x.category && x.category.toLowerCase().includes(search)) ||
             (x.trackingCode && x.trackingCode.toLowerCase().includes(search)) ||
             (x.note && x.note.toLowerCase().includes(search)) ||
             String(x.documentNumber || '').includes(search) ||
             custName.includes(search);
    });
  }

  document.getElementById('expenses-empty').style.display = list.length ? 'none' : 'block';
  renderExpenseStats();

  [...list].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
    const cust = db.customers.find(c => c.id === item.customerId);
    const tr = document.createElement('tr');
    const isOut = item.type === 'expense' || item.type === 'income_return';
    const amountColor = isOut ? 'color:#f28b82;' : 'color:var(--success);';
    const sign = isOut ? '-' : '+';
    tr.innerHTML = `
      <td><b>#${item.documentNumber || '—'}</b></td>
      <td>${new Date(item.date).toLocaleDateString('fa-IR')}</td>
      <td>${typeBadgeHtml(item.type)}</td>
      <td>
        <div style="font-weight:700;">${item.title}</div>
        <div class="stat-sub">${item.category || 'عمومی'}</div>
      </td>
      <td>${cust ? cust.name : '—'}</td>
      <td style="color:var(--text-faint); font-size:11.5px;">${methodLabel(item.paymentMethod, item.accountId)}</td>
      <td style="font-weight:700; ${amountColor}">${sign}${toFa(item.amount)} ریال</td>
      <td style="color:var(--text-faint); font-size:11.5px;">${item.trackingCode || '—'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-sm" onclick="openVoucherModal('${item.id}')" title="رسید و سند">🧾 سند</button>
        <button class="btn btn-sm" onclick="openExpenseIncomeForm(null, '${item.id}')">ویرایش</button>
        <button class="btn btn-sm" onclick="deleteExpenseIncome('${item.id}')" style="color:var(--danger);">حذف</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderExpenseCategoriesView(){
  const expTbody = document.getElementById('categories-expense-table');
  const incTbody = document.getElementById('categories-income-table');
  if(!expTbody || !incTbody) return;
  expTbody.innerHTML = '';
  incTbody.innerHTML = '';

  const expCats = getExpenseCategories('expense');
  const incCats = getExpenseCategories('income');
  const allItems = db.expensesIncomes || [];

  expCats.forEach(cat => {
    const catItems = allItems.filter(x => (x.type === 'expense' || x.type === 'expense_return') && x.category === cat);
    const sum = catItems.reduce((acc, x) => acc + (x.type === 'expense' ? x.amount : -x.amount), 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${cat}</b></td><td>${toFa(catItems.length)} سند</td><td style="font-weight:700; color:#f28b82;">${toFa(sum)} ریال</td>`;
    expTbody.appendChild(tr);
  });

  incCats.forEach(cat => {
    const catItems = allItems.filter(x => (x.type === 'income' || x.type === 'income_return') && x.category === cat);
    const sum = catItems.reduce((acc, x) => acc + (x.type === 'income' ? x.amount : -x.amount), 0);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${cat}</b></td><td>${toFa(catItems.length)} سند</td><td style="font-weight:700; color:var(--success);">${toFa(sum)} ریال</td>`;
    incTbody.appendChild(tr);
  });
}

function promptAddCategory(type){
  const isExp = type === 'expense';
  showPromptModal({
    title: `افزودن سرفصل جدید ${isExp ? 'هزینه' : 'درآمد'}`,
    message: `نام سرفصل یا دسته‌بندی جدید ${isExp ? 'هزینه (مانند: آب و برق، کرایه، پیک)' : 'درآمد (مانند: اجرت تعمیرات، خدمات)'}:`,
    placeholder: 'عنوان سرفصل...',
    confirmText: 'ثبت سرفصل',
    onConfirm: (trimmed) => {
      if(!trimmed) return;
      if(!db.customCategories) db.customCategories = { expense: [], income: [] };
      if(!db.customCategories[type]) db.customCategories[type] = [];
      if(!db.customCategories[type].includes(trimmed)){
        db.customCategories[type].push(trimmed);
        persist('customCategories');
        toast(`سرفصل «${trimmed}» با موفقیت اضافه شد`, 'success');
        renderExpenseCategoriesView();
        renderExpenses();
      } else {
        toast('این سرفصل قبلاً ثبت شده است', 'error');
      }
    }
  });
}

/* ============ vouchers & accounting documents module ============ */
let activeVoucherId = null;
let activeVoucherSourceType = null;
let editingManualJournalId = null;

function isDocumentNumberDuplicate(num: number, excludeSourceId?: string, excludeSourceType?: string): boolean {
  if(num === 1){
    if(excludeSourceType !== 'opening') return true;
    return false;
  }
  const allDocs = [
    ...(db.invoices || []).map(x => ({ id: x.id, type: 'invoice', documentNumber: x.documentNumber })),
    ...(db.expensesIncomes || []).map(x => ({ id: x.id, type: 'expense', documentNumber: x.documentNumber })),
    ...(db.financialTransactions || []).map(x => ({ id: x.id, type: 'transaction', documentNumber: x.documentNumber })),
    ...(db.checks || []).map(x => ({ id: x.id, type: 'check', documentNumber: x.documentNumber })),
    ...(db.manualJournals || []).map(x => ({ id: x.id, type: 'manual', documentNumber: x.documentNumber }))
  ];

  for(const d of allDocs){
    if(d.id === excludeSourceId && (d.type === excludeSourceType || (excludeSourceType === 'invoice' && d.type === 'invoice'))) continue;
    if(d.documentNumber === num) return true;
  }
  return false;
}

function getNextPermanentId(): number {
  let max = 1; // 1 is always reserved for Opening Voucher (سند افتتاحیه)
  const all = [
    ...(db.invoices || []),
    ...(db.expensesIncomes || []),
    ...(db.financialTransactions || []),
    ...(db.checks || []),
    ...(db.manualJournals || [])
  ];
  all.forEach(d => {
    if(d && typeof d.permanentId === 'number' && d.permanentId > max) max = d.permanentId;
  });
  return max + 1;
}

function getNextDocumentNumber(): number {
  const used = new Set<number>();
  used.add(1); // 1 is strictly reserved for Opening Voucher (سند افتتاحیه)
  const all = [
    ...(db.invoices || []),
    ...(db.expensesIncomes || []),
    ...(db.financialTransactions || []),
    ...(db.checks || []),
    ...(db.manualJournals || [])
  ];
  all.forEach(d => {
    if(d && typeof d.documentNumber === 'number' && d.documentNumber > 0){
      used.add(d.documentNumber);
    }
  });
  let next = 2;
  while(used.has(next)){
    next++;
  }
  return next;
}

function getNextInvoiceNumber(): number {
  let max = 0;
  (db.invoices || []).forEach(inv => {
    if(inv && typeof inv.number === 'number' && inv.number > max){
      max = inv.number;
    }
  });
  return max + 1;
}

function ensureDocumentIdentifiers(){
  let nextPerm = 2; // 1 is strictly Opening Voucher
  let dirty = false;
  const usedDocNums = new Set<number>();
  usedDocNums.add(1); // 1 is Opening Voucher

  function assignDocNum(currentDocNum: any): number {
    let num = (typeof currentDocNum === 'number' && currentDocNum > 1) ? currentDocNum : null;
    if(num && !usedDocNums.has(num)){
      usedDocNums.add(num);
      return num;
    }
    let candidate = 2;
    while(usedDocNums.has(candidate)){
      candidate++;
    }
    usedDocNums.add(candidate);
    dirty = true;
    return candidate;
  }

  if(db.invoices){
    db.invoices.forEach((inv, i) => {
      if(!inv.permanentId || inv.permanentId < 2){
        inv.permanentId = nextPerm++;
        dirty = true;
      } else if(inv.permanentId >= nextPerm){
        nextPerm = inv.permanentId + 1;
      }
      const assigned = assignDocNum(inv.documentNumber);
      if(inv.documentNumber !== assigned){
        inv.documentNumber = assigned;
        dirty = true;
      }
      if(!inv.number || inv.number <= 0){
        inv.number = i + 1;
        dirty = true;
      }
    });
  }

  if(db.expensesIncomes){
    db.expensesIncomes.forEach(ei => {
      if(!ei.permanentId || ei.permanentId < 2){
        ei.permanentId = nextPerm++;
        dirty = true;
      } else if(ei.permanentId >= nextPerm){
        nextPerm = ei.permanentId + 1;
      }
      const assigned = assignDocNum(ei.documentNumber);
      if(ei.documentNumber !== assigned){
        ei.documentNumber = assigned;
        dirty = true;
      }
    });
  }

  if(db.financialTransactions){
    db.financialTransactions.forEach(tx => {
      if(!tx.permanentId || tx.permanentId < 2){
        tx.permanentId = nextPerm++;
        dirty = true;
      } else if(tx.permanentId >= nextPerm){
        nextPerm = tx.permanentId + 1;
      }
      const assigned = assignDocNum(tx.documentNumber);
      if(tx.documentNumber !== assigned){
        tx.documentNumber = assigned;
        dirty = true;
      }
    });
  }

  if(db.checks){
    db.checks.forEach(chk => {
      if(!chk.permanentId || chk.permanentId < 2){
        chk.permanentId = nextPerm++;
        dirty = true;
      } else if(chk.permanentId >= nextPerm){
        nextPerm = chk.permanentId + 1;
      }
      const assigned = assignDocNum(chk.documentNumber);
      if(chk.documentNumber !== assigned){
        chk.documentNumber = assigned;
        dirty = true;
      }
    });
  }

  if(db.manualJournals){
    db.manualJournals.forEach(mj => {
      if(!mj.permanentId || mj.permanentId < 2){
        mj.permanentId = nextPerm++;
        dirty = true;
      } else if(mj.permanentId >= nextPerm){
        nextPerm = mj.permanentId + 1;
      }
      const assigned = assignDocNum(mj.documentNumber);
      if(mj.documentNumber !== assigned){
        mj.documentNumber = assigned;
        dirty = true;
      }
    });
  }

  if(dirty){
    persist('invoices');
    persist('expensesIncomes');
    persist('financialTransactions');
    persist('checks');
    persist('manualJournals');
  }
}

function getAllAccountingDocuments(){
  ensureDocumentIdentifiers();
  const docs = [];

  // Invoices
  (db.invoices || []).forEach(inv => {
    const cust = db.customers.find(c => c.id === inv.customerId);
    const isSell = inv.type === 'sell';
    const itemsCount = inv.items?.length || 0;
    const itemsNames = (inv.items || []).map(it => it.itemName).filter(Boolean).slice(0, 3).join('، ');
    const desc = `${itemsCount} قلم طلا: ${itemsNames || 'اقلام طلا'}${inv.note ? ' — ' + inv.note : ''}`;
    docs.push({
      id: inv.id,
      sourceType: 'invoice',
      sourceId: inv.id,
      permanentId: inv.permanentId || 1,
      documentNumber: inv.documentNumber || (1000 + inv.number),
      invoiceNumber: '#' + inv.number,
      date: inv.date,
      type: inv.type,
      typeLabel: isSell ? 'فاکتور فروش طلا' : 'فاکتور خرید طلا',
      badgeCls: isSell ? 'badge-synced' : 'badge-pending',
      customerName: cust ? cust.name : 'مشتری متفرقه',
      customerId: inv.customerId,
      description: desc,
      goldWeight: inv.karatWeightSum || inv.weightSum || 0,
      amount: inv.total || 0,
      is_synced: inv.is_synced,
      rawObj: inv
    });
  });

  // Expenses and Incomes
  (db.expensesIncomes || []).forEach(ei => {
    const cust = db.customers.find(c => c.id === ei.customerId);
    const isOut = ei.type === 'expense' || ei.type === 'income_return';
    docs.push({
      id: ei.id,
      sourceType: ei.type,
      sourceId: ei.id,
      permanentId: ei.permanentId || 1,
      documentNumber: ei.documentNumber || 1001,
      invoiceNumber: ei.trackingCode ? (ei.trackingCode.startsWith('#') ? ei.trackingCode : '#' + ei.trackingCode) : null,
      date: ei.date,
      type: ei.type,
      typeLabel: typeLabel(ei.type),
      badgeCls: isOut ? 'badge-pending' : 'badge-synced',
      customerName: cust ? cust.name : (ei.paymentMethod === 'bank' ? 'حساب بانکی' : ei.paymentMethod === 'cash' ? 'صندوق' : 'عمومی / هزینه‌ها'),
      customerId: ei.customerId,
      description: `[${ei.category || 'عمومی'}] ${ei.title}${ei.note ? ' — ' + ei.note : ''}`,
      goldWeight: 0,
      amount: ei.amount || 0,
      is_synced: ei.is_synced,
      rawObj: ei
    });
  });

  // Direct Financial Transactions
  (db.financialTransactions || []).forEach(tx => {
    const cust = db.customers.find(c => c.id === tx.customerId);
    const acc = db.financialAccounts.find(a => a.id === tx.accountId);
    const isDeposit = tx.kind === 'deposit';
    docs.push({
      id: tx.id,
      sourceType: 'transaction',
      sourceId: tx.id,
      permanentId: tx.permanentId || 1,
      documentNumber: tx.documentNumber || 1001,
      invoiceNumber: tx.invoiceId ? (db.invoices.find(i => i.id === tx.invoiceId)?.number ? '#' + db.invoices.find(i => i.id === tx.invoiceId).number : null) : null,
      date: tx.date,
      type: tx.kind,
      typeLabel: isDeposit ? 'دریافت وجه (واریز)' : 'پرداخت وجه (خروج)',
      badgeCls: isDeposit ? 'badge-synced' : 'badge-pending',
      customerName: cust ? cust.name : (acc ? acc.name : 'طرف حساب'),
      customerId: tx.customerId,
      description: `[${acc ? acc.name : (tx.method==='bank'?'بانک':'صندوق')}] ${tx.note || (isDeposit ? 'دریافت وجه' : 'پرداخت وجه')}`,
      goldWeight: 0,
      amount: tx.amount || 0,
      is_synced: tx.is_synced,
      rawObj: tx
    });
  });

  // Checks
  (db.checks || []).forEach(chk => {
    const cust = db.customers.find(c => c.id === chk.customerId);
    const isRec = chk.type === 'received';
    docs.push({
      id: chk.id,
      sourceType: 'check',
      sourceId: chk.id,
      permanentId: chk.permanentId || 1,
      documentNumber: chk.documentNumber || 1001,
      invoiceNumber: chk.invoiceId ? (db.invoices.find(i => i.id === chk.invoiceId)?.number ? '#' + db.invoices.find(i => i.id === chk.invoiceId).number : null) : null,
      date: chk.dueDate || chk.updated_at,
      type: 'check_' + chk.type,
      typeLabel: isRec ? 'چک دریافتی' : 'چک پرداختی',
      badgeCls: isRec ? 'badge-synced' : 'badge-pending',
      customerName: cust ? cust.name : 'طرف حساب',
      customerId: chk.customerId,
      description: `چک #${chk.number} ${chk.bank ? 'بانک ' + chk.bank : ''} — سررسید: ${chk.dueDate ? new Date(chk.dueDate).toLocaleDateString('fa-IR') : '—'} (${chk.status==='cashed'?'وصول‌شده':chk.status==='bounced'?'برگشت‌خورده':'نزد ما'})`,
      goldWeight: 0,
      amount: chk.amount || 0,
      is_synced: chk.is_synced,
      rawObj: chk
    });
  });

  // Manual Journals
  (db.manualJournals || []).forEach(mj => {
    const cust = db.customers.find(c => c.id === mj.customerId);
    docs.push({
      id: mj.id,
      sourceType: 'manual',
      sourceId: mj.id,
      permanentId: mj.permanentId || 1,
      documentNumber: mj.documentNumber || 1001,
      invoiceNumber: mj.refNumber ? (mj.refNumber.startsWith('#') ? mj.refNumber : '#' + mj.refNumber) : null,
      date: mj.date,
      type: 'manual',
      typeLabel: 'سند حسابداری دستی',
      badgeCls: 'badge-doc-num',
      customerName: cust ? cust.name : 'سرفصل‌های عمومی',
      customerId: mj.customerId,
      description: `[بد: ${mj.debitAccountName || 'حساب'} / بس: ${mj.creditAccountName || 'حساب'}] ${mj.description}`,
      goldWeight: mj.goldWeight || 0,
      amount: mj.amount || 0,
      is_synced: mj.is_synced,
      rawObj: mj
    });
  });

  // Opening Balance Document (سند افتتاحیه دوره - شماره ۱ سیستم)
  let openingRialSum = 0;
  let openingGoldSum = 0;
  (db.financialAccounts || []).forEach(a => { openingRialSum += Math.abs(a.initialBalance || 0); });
  (db.customers || []).forEach(c => {
    openingRialSum += Math.abs(c.initialTomanBalance || 0);
    openingGoldSum += Math.abs(c.initialGoldBalance || 0);
  });
  (db.stock || []).forEach(s => {
    openingGoldSum += (s.weight || 0);
  });

  const openingDate = db.settings?.fiscalYearStart || new Date(new Date().getFullYear(), 0, 1).toISOString();
  docs.unshift({
    id: 'doc_opening_balance',
    sourceType: 'opening',
    sourceId: 'doc_opening_balance',
    permanentId: 1,
    documentNumber: 1,
    invoiceNumber: null,
    date: openingDate,
    type: 'opening',
    typeLabel: 'سند افتتاحیه دوره',
    badgeCls: 'badge-doc-opening',
    customerName: 'تراز افتتاحیه / ترازنامه اول دوره',
    customerId: null,
    description: 'سند افتتاحیه و ثبت مانده‌های اولیه صندوق، بانک‌ها، اشخاص و موجودی طلای اول دوره',
    goldWeight: openingGoldSum,
    amount: openingRialSum,
    is_synced: true,
    rawObj: { id: 'doc_opening_balance', type: 'opening' }
  });

  return docs;
}

function renderVouchersView(){
  renderVouchersTable();
}

function renderVouchersTable(){
  const tbody = document.getElementById('vouchers-table');
  if(!tbody) return;
  tbody.innerHTML = '';

  const allDocs = getAllAccountingDocuments();

  // Update summary stats
  const countEl = document.getElementById('stat-vouchers-count');
  const rialEl = document.getElementById('stat-vouchers-rial');
  const goldEl = document.getElementById('stat-vouchers-gold');
  const invCountEl = document.getElementById('stat-vouchers-invoices');

  const totalRial = allDocs.reduce((s, d) => s + (d.amount || 0), 0);
  const totalGold = allDocs.reduce((s, d) => s + (d.goldWeight || 0), 0);
  const invCount = allDocs.filter(d => d.sourceType === 'invoice').length;

  if(countEl) countEl.textContent = toFa(allDocs.length);
  if(rialEl) rialEl.textContent = toFa(Math.round(totalRial)) + ' ریال';
  if(goldEl) goldEl.textContent = toFa(totalGold.toFixed(3)) + ' گرم';
  if(invCountEl) invCountEl.textContent = toFa(invCount);

  // Filters
  const searchInput = document.getElementById('vouchers-search') || document.getElementById('voucher-search');
  const search = toEn(searchInput?.value || '').toLowerCase().trim();
  const typeFilter = (document.getElementById('vouchers-filter-type') || document.getElementById('voucher-filter-type'))?.value || 'all';
  const range = (document.getElementById('vouchers-filter-range') || document.getElementById('voucher-filter-range'))?.value || 'all';
  const sortMode = (document.getElementById('vouchers-sort') || document.getElementById('voucher-sort'))?.value || 'date-desc';

  const now = new Date();
  let cutoff = null;
  if(range === 'today') cutoff = new Date(now.toDateString());
  if(range === 'week') cutoff = new Date(now.getTime() - 7*24*60*60*1000);
  if(range === 'month') cutoff = new Date(now.getTime() - 30*24*60*60*1000);

  let filtered = allDocs.filter(d => {
    if(typeFilter === 'invoices' && d.sourceType !== 'invoice') return false;
    if(typeFilter === 'sell' && d.type !== 'sell') return false;
    if(typeFilter === 'buy' && d.type !== 'buy') return false;
    if(typeFilter === 'expenses_incomes' && (d.sourceType !== 'expense' && d.sourceType !== 'expense_return' && d.sourceType !== 'income' && d.sourceType !== 'income_return')) return false;
    if(typeFilter === 'expense' && (d.sourceType !== 'expense' && d.sourceType !== 'expense_return')) return false;
    if(typeFilter === 'income' && (d.sourceType !== 'income' && d.sourceType !== 'income_return')) return false;
    if(typeFilter === 'checks' && d.sourceType !== 'check') return false;
    if(typeFilter === 'check' && d.sourceType !== 'check') return false;
    if(typeFilter === 'transactions' && d.sourceType !== 'transaction') return false;
    if(typeFilter === 'transaction' && d.sourceType !== 'transaction') return false;
    if(typeFilter === 'manual' && d.sourceType !== 'manual') return false;

    if(cutoff && new Date(d.date) < cutoff) return false;

    if(search){
      const matchPerm = String(d.permanentId).includes(search);
      const matchDocNum = String(d.documentNumber).includes(search);
      const matchInvNum = d.invoiceNumber ? d.invoiceNumber.toLowerCase().includes(search) : false;
      const matchCust = d.customerName ? d.customerName.toLowerCase().includes(search) : false;
      const matchDesc = d.description ? d.description.toLowerCase().includes(search) : false;
      const matchAmt = String(d.amount).includes(search);
      if(!matchPerm && !matchDocNum && !matchInvNum && !matchCust && !matchDesc && !matchAmt) return false;
    }
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if(sortMode === 'date-desc' || sortMode === 'date_desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if(sortMode === 'date-asc' || sortMode === 'date_asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if(sortMode === 'docnum-desc' || sortMode === 'doc_desc') return (b.documentNumber || 0) - (a.documentNumber || 0);
    if(sortMode === 'docnum-asc' || sortMode === 'doc_asc') return (a.documentNumber || 0) - (b.documentNumber || 0);
    if(sortMode === 'permnum-desc') return (b.permanentId || 0) - (a.permanentId || 0);
    if(sortMode === 'permnum-asc') return (a.permanentId || 0) - (b.permanentId || 0);
    if(sortMode === 'amount-desc' || sortMode === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
    if(sortMode === 'amount-asc' || sortMode === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
    return 0;
  });

  const emptyEl = document.getElementById('vouchers-empty');
  if(emptyEl) emptyEl.style.display = filtered.length ? 'none' : 'block';

  filtered.forEach(doc => {
    const tr = document.createElement('tr');
    const dStr = doc.date ? new Date(doc.date).toLocaleDateString('fa-IR') : '—';
    const goldDisplay = doc.goldWeight > 0 ? `<b style="color:var(--gold-bright);">${toFa(doc.goldWeight.toFixed(3))} g</b>` : '<span style="color:var(--text-faint);">—</span>';
    const amountDisplay = doc.amount > 0 ? `<b>${toFa(Math.round(doc.amount))} ریال</b>` : '<span style="color:var(--text-faint);">—</span>';
    const invDisplay = doc.invoiceNumber ? `<span class="badge-inv-num">${toFa(doc.invoiceNumber)}</span>` : '<span style="color:var(--text-faint);">—</span>';

    tr.innerHTML = `
      <td style="text-align:center;"><span class="badge-doc-perm" title="شماره ثابت سیستم (غیرقابل تغییر 🔒)">${toFa(doc.permanentId)}</span></td>
      <td style="text-align:center;"><span class="badge-doc-num" title="شماره سند حسابداری">#${toFa(doc.documentNumber)}</span></td>
      <td style="text-align:center;">${invDisplay}</td>
      <td style="font-size:12px; white-space:nowrap;">${dStr}</td>
      <td><span class="badge ${doc.badgeCls}"><span class="dot"></span>${doc.typeLabel}</span></td>
      <td><b>${doc.customerName || '—'}</b></td>
      <td style="color:var(--text-dim); font-size:11.5px; max-width:280px;" class="truncate" title="${escAttr(doc.description)}">${doc.description}</td>
      <td style="text-align:center;">${goldDisplay}</td>
      <td>${amountDisplay}</td>
      <td style="text-align:left; white-space:nowrap;">
        <button class="btn btn-sm" onclick="openVoucherDetailModal('${doc.sourceId}', '${doc.sourceType}')" title="نمایش سند دوبل رسمی و چاپ">👁️ سند</button>
        <button class="btn btn-sm" onclick="editDocumentBySource('${doc.sourceType}', '${doc.sourceId}')" title="${doc.sourceType==='opening'?'مشاهده/ویرایش مانده‌های افتتاحیه':'ویرایش سند'}">✏️ ویرایش</button>
        ${doc.sourceType !== 'opening' ? `<button class="btn btn-sm" style="color:var(--danger);" onclick="deleteAccountingDocument('${doc.sourceType}', '${doc.sourceId}')" title="حذف سند و برگشت ترازها">🗑️ حذف</button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openVoucherModal(docId: string, docType?: string){
  openVoucherDetailModal(docId, docType);
}

function openVoucherDetailModal(docId, docType){
  activeVoucherId = docId;
  activeVoucherSourceType = docType;
  const overlay = document.getElementById('voucher-modal-overlay');
  const body = document.getElementById('voucher-modal-body');
  if(!overlay || !body) return;

  const allDocs = getAllAccountingDocuments();
  const doc = allDocs.find(d => d.sourceId === docId && (d.sourceType === docType || (docType==='invoice' && d.sourceType==='invoice')));
  if(!doc){ toast('سند مورد نظر یافت نشد'); return; }

  let articlesHtml = '';
  let extraDetailHtml = '';
  let totalDebitRial = 0;
  let totalCreditRial = 0;
  let totalDebitGold = 0;
  let totalCreditGold = 0;

  if(doc.sourceType === 'invoice'){
    const inv = doc.rawObj;
    const cust = db.customers.find(c => c.id === inv.customerId);
    const isSell = inv.type === 'sell';

    if(isSell){
      // Sell invoice journal entries:
      // 1. Debit Accounts Receivable (Customer)
      totalDebitRial += inv.total;
      if(inv.accountMode === 'gold') totalDebitGold += (inv.karatWeightSum || 0);

      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۱۰۳۰۱</b></td>
          <td><b>حساب‌های دریافتنی تجاری</b><br><span style="font-size:11px; color:var(--gold-bright);">مشتری: ${cust ? cust.name : 'متفرقه'}</span></td>
          <td>بابت فروش طلا و جواهر طبق فاکتور #${toFa(inv.number)}</td>
          <td><b>${toFa(inv.total)}</b></td>
          <td>—</td>
          <td>${inv.accountMode==='gold' ? toFa((inv.karatWeightSum||0).toFixed(3)) : '—'}</td>
          <td>—</td>
        </tr>
      `;

      // 2. Credit Gold Sales (Pure Gold 18k)
      totalCreditRial += (inv.goldPriceSum || 0);
      totalCreditGold += (inv.karatWeightSum || 0);
      articlesHtml += `
        <tr>
          <td>۲</td>
          <td><b>۶۰۱۰۱</b></td>
          <td><b>فروش طلای ۱۸ عیار</b><br><span style="font-size:11px; color:var(--text-faint);">ارزش اصل طلای خام (معاف ماده ۲۶)</span></td>
          <td>ارزش خام طلای فاکتور #${toFa(inv.number)} (${toFa((inv.karatWeightSum||0).toFixed(3))} گرم)</td>
          <td>—</td>
          <td><b>${toFa(inv.goldPriceSum || 0)}</b></td>
          <td>—</td>
          <td>${toFa((inv.karatWeightSum||0).toFixed(3))}</td>
        </tr>
      `;

      // 3. Credit Wage Revenue
      if(inv.wageSum > 0){
        totalCreditRial += inv.wageSum;
        articlesHtml += `
          <tr>
            <td>۳</td>
            <td><b>۶۰۲۰۱</b></td>
            <td><b>درآمد اجرت ساخت طلا</b><br><span style="font-size:11px; color:var(--text-faint);">خدمات و ساخت</span></td>
            <td>جمع اجرت ساخت اقلام فاکتور #${toFa(inv.number)}</td>
            <td>—</td>
            <td><b>${toFa(inv.wageSum)}</b></td>
            <td>—</td>
            <td>—</td>
          </tr>
        `;
      }

      // 4. Credit Seller Profit
      if(inv.profitSum > 0){
        totalCreditRial += inv.profitSum;
        articlesHtml += `
          <tr>
            <td>۴</td>
            <td><b>۶۰۳۰۱</b></td>
            <td><b>سود فروشگاه (${db.settings.profit}٪)</b><br><span style="font-size:11px; color:var(--text-faint);">سود مصوب اتحادیه</span></td>
            <td>سود فروشنده فاکتور #${toFa(inv.number)}</td>
            <td>—</td>
            <td><b>${toFa(inv.profitSum)}</b></td>
            <td>—</td>
            <td>—</td>
          </tr>
        `;
      }

      // 5. Credit VAT (Tax)
      if(inv.taxSum > 0){
        totalCreditRial += inv.taxSum;
        articlesHtml += `
          <tr>
            <td>۵</td>
            <td><b>۴۰۴۰۱</b></td>
            <td><b>مالیات بر ارزش افزوده پرداختنی</b><br><span style="font-size:11px; color:var(--text-faint);">قانون ماده ۲۶ (اجرت و سود)</span></td>
            <td>مالیات بر ارزش افزوده فاکتور #${toFa(inv.number)}</td>
            <td>—</td>
            <td><b>${toFa(inv.taxSum)}</b></td>
            <td>—</td>
            <td>—</td>
          </tr>
        `;
      }

      // 6. Debit Discounts if any
      if(inv.discountSum > 0){
        totalDebitRial += inv.discountSum;
        articlesHtml += `
          <tr>
            <td>۶</td>
            <td><b>۶۰۴۰۱</b></td>
            <td><b>تخفیفات اعطایی فروش</b><br><span style="font-size:11px; color:var(--danger);">تخفیف به مشتری</span></td>
            <td>تخفیف فاکتور #${toFa(inv.number)}</td>
            <td><b>${toFa(inv.discountSum)}</b></td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          </tr>
        `;
      }
    } else {
      // Buy invoice journal entries
      totalDebitRial += inv.total;
      totalDebitGold += (inv.karatWeightSum || 0);
      totalCreditRial += inv.total;
      if(inv.accountMode === 'gold') totalCreditGold += (inv.karatWeightSum || 0);

      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۱۵۱۰۱</b></td>
          <td><b>موجودی طلای خام و متفرقه</b><br><span style="font-size:11px; color:var(--text-faint);">خرید طلا از مشتری</span></td>
          <td>خرید طلا طبق فاکتور خرید #${toFa(inv.number)}</td>
          <td><b>${toFa(inv.total)}</b></td>
          <td>—</td>
          <td>${toFa((inv.karatWeightSum||0).toFixed(3))}</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۲۰۱۰۱</b></td>
          <td><b>حساب‌های پرداختنی تجاری</b><br><span style="font-size:11px; color:var(--gold-bright);">فروشنده: ${cust ? cust.name : 'متفرقه'}</span></td>
          <td>بستانکاری طرف حساب بابت فاکتور خرید #${toFa(inv.number)}</td>
          <td>—</td>
          <td><b>${toFa(inv.total)}</b></td>
          <td>—</td>
          <td>${inv.accountMode==='gold' ? toFa((inv.karatWeightSum||0).toFixed(3)) : '—'}</td>
        </tr>
      `;
    }

    // Items list table
    const itemsRows = (inv.items || []).map((it, idx) => `
      <tr>
        <td>${idx+1}</td>
        <td><b>${it.itemName}</b></td>
        <td>${toFa(it.karat)}</td>
        <td>${toFa(it.weight)} گرم</td>
        <td>${toFa(it.wagePercent)}٪</td>
        <td><b>${toFa(it.amount)} ریال</b></td>
      </tr>
    `).join('');

    extraDetailHtml = `
      <div style="margin-top:16px;">
        <div style="font-weight:700; font-size:12px; margin-bottom:6px; color:var(--gold-bright);">📋 اقلام کالایی فاکتور:</div>
        <table style="width:100%; font-size:11.5px; margin-bottom:12px;">
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th>نام کالا</th>
              <th style="width:50px;">عیار</th>
              <th style="width:90px;">وزن</th>
              <th style="width:70px;">اجرت</th>
              <th style="width:130px;">مبلغ نهایی قلم</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </div>
    `;
  } else if(doc.sourceType === 'expense' || doc.sourceType === 'expense_return' || doc.sourceType === 'income' || doc.sourceType === 'income_return'){
    const ei = doc.rawObj;
    const isOut = ei.type === 'expense' || ei.type === 'income_return';
    const acc = db.financialAccounts.find(a => a.id === ei.accountId);
    const cust = db.customers.find(c => c.id === ei.customerId);
    const accLabel = acc ? `حساب ${acc.type==='bank'?'بانک':'صندوق'}: ${acc.name}` : methodLabel(ei.paymentMethod, ei.accountId);

    totalDebitRial += ei.amount;
    totalCreditRial += ei.amount;

    if(ei.type === 'expense'){
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۸۰۱۰۱</b></td>
          <td><b>هزینه‌های عمومی و اداری</b><br><span style="font-size:11px; color:var(--text-faint);">سرفصل: ${ei.category || 'عمومی'}</span></td>
          <td>${ei.title}${ei.note ? ' — ' + ei.note : ''}</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۱۰۱۰۱</b></td>
          <td><b>${accLabel}</b><br><span style="font-size:11px; color:var(--text-faint);">${cust ? 'طرف حساب: ' + cust.name : ''}</span></td>
          <td>پرداخت بابت ${ei.title}</td>
          <td>—</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    } else if(ei.type === 'income'){
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۱۰۱۰۱</b></td>
          <td><b>${accLabel}</b><br><span style="font-size:11px; color:var(--text-faint);">${cust ? 'طرف حساب: ' + cust.name : ''}</span></td>
          <td>دریافت وجه بابت ${ei.title}</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۷۰۱۰۱</b></td>
          <td><b>درآمدهای متفرقه و خدمات زرگری</b><br><span style="font-size:11px; color:var(--text-faint);">سرفصل: ${ei.category || 'عمومی'}</span></td>
          <td>${ei.title}${ei.note ? ' — ' + ei.note : ''}</td>
          <td>—</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    } else if(ei.type === 'expense_return'){
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۱۰۱۰۱</b></td>
          <td><b>${accLabel}</b></td>
          <td>استرداد وجه بابت ${ei.title}</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۸۰۱۰۱</b></td>
          <td><b>برگشت از هزینه‌ها</b><br><span style="font-size:11px; color:var(--text-faint);">سرفصل: ${ei.category}</span></td>
          <td>${ei.title}</td>
          <td>—</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    } else {
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۷۰۱۰۱</b></td>
          <td><b>برگشت از درآمد</b></td>
          <td>استرداد وجه درآمد به مشتری بابت ${ei.title}</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۱۰۱۰۱</b></td>
          <td><b>${accLabel}</b></td>
          <td>پرداخت استرداد وجه</td>
          <td>—</td>
          <td><b>${toFa(ei.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    }
  } else if(doc.sourceType === 'transaction'){
    const tx = doc.rawObj;
    const acc = db.financialAccounts.find(a => a.id === tx.accountId);
    const cust = db.customers.find(c => c.id === tx.customerId);
    const accLabel = acc ? `حساب ${acc.type==='bank'?'بانک':'صندوق'}: ${acc.name}` : (tx.method==='bank'?'حساب بانک':'صندوق فروشگاه');
    const custLabel = cust ? cust.name : 'طرف حساب';

    totalDebitRial += tx.amount;
    totalCreditRial += tx.amount;

    if(tx.kind === 'deposit'){
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۱۰۱۰۱</b></td>
          <td><b>${accLabel}</b></td>
          <td>دریافت وجه / واریز به حساب${tx.note ? ' — ' + tx.note : ''}</td>
          <td><b>${toFa(tx.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۱۰۳۰۱</b></td>
          <td><b>حساب‌های دریافتنی (${custLabel})</b></td>
          <td>کاهش بدهی مشتری بابت واریز وجه</td>
          <td>—</td>
          <td><b>${toFa(tx.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    } else {
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۲۰۱۰۱</b></td>
          <td><b>حساب‌های پرداختنی (${custLabel})</b></td>
          <td>پرداخت وجه به طرف حساب${tx.note ? ' — ' + tx.note : ''}</td>
          <td><b>${toFa(tx.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۱۰۱۰۱</b></td>
          <td><b>${accLabel}</b></td>
          <td>خروج وجه از حساب</td>
          <td>—</td>
          <td><b>${toFa(tx.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    }
  } else if(doc.sourceType === 'check'){
    const chk = doc.rawObj;
    const cust = db.customers.find(c => c.id === chk.customerId);
    const custLabel = cust ? cust.name : 'طرف حساب';

    totalDebitRial += chk.amount;
    totalCreditRial += chk.amount;

    if(chk.type === 'received'){
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۱۰۴۰۱</b></td>
          <td><b>اسناد دریافتنی تجاری (چک‌های نزد صندوق)</b></td>
          <td>چک #${chk.number} عهده بانک ${chk.bank || '—'} سررسید ${chk.dueDate ? new Date(chk.dueDate).toLocaleDateString('fa-IR') : '—'}</td>
          <td><b>${toFa(chk.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۱۰۳۰۱</b></td>
          <td><b>حساب‌های دریافتنی (${custLabel})</b></td>
          <td>تسویه حساب از طریق تحویل چک</td>
          <td>—</td>
          <td><b>${toFa(chk.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    } else {
      articlesHtml += `
        <tr>
          <td>۱</td>
          <td><b>۲۰۱۰۱</b></td>
          <td><b>حساب‌های پرداختنی (${custLabel})</b></td>
          <td>پرداخت به طرف حساب با صدور چک #${chk.number}</td>
          <td><b>${toFa(chk.amount)}</b></td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
        </tr>
        <tr>
          <td>۲</td>
          <td><b>۲۰۳۰۱</b></td>
          <td><b>اسناد پرداختنی تجاری (چک‌های صادره)</b></td>
          <td>چک صادره #${chk.number} بانک ${chk.bank || '—'} سررسید ${chk.dueDate ? new Date(chk.dueDate).toLocaleDateString('fa-IR') : '—'}</td>
          <td>—</td>
          <td><b>${toFa(chk.amount)}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    }
  } else if(doc.sourceType === 'manual'){
    const mj = doc.rawObj;
    totalDebitRial += (mj.amount || 0);
    totalCreditRial += (mj.amount || 0);
    totalDebitGold += (mj.goldWeight || 0);
    totalCreditGold += (mj.goldWeight || 0);

    articlesHtml += `
      <tr>
        <td>۱</td>
        <td><b>—</b></td>
        <td><b>${mj.debitAccountName || 'حساب بدهکار'}</b></td>
        <td>${mj.description}</td>
        <td><b>${mj.amount ? toFa(mj.amount) : '—'}</b></td>
        <td>—</td>
        <td>${mj.goldWeight ? toFa(mj.goldWeight.toFixed(3)) : '—'}</td>
        <td>—</td>
      </tr>
      <tr>
        <td>۲</td>
        <td><b>—</b></td>
        <td><b>${mj.creditAccountName || 'حساب بستانکار'}</b></td>
        <td>${mj.description}</td>
        <td>—</td>
        <td><b>${mj.amount ? toFa(mj.amount) : '—'}</b></td>
        <td>—</td>
        <td>${mj.goldWeight ? toFa(mj.goldWeight.toFixed(3)) : '—'}</td>
      </tr>
    `;
  } else if(doc.sourceType === 'opening'){
    let rowIdx = 1;
    // 1. Bank & Cash Accounts
    (db.financialAccounts || []).forEach(a => {
      if(a.initialBalance > 0){
        totalDebitRial += a.initialBalance;
        articlesHtml += `
          <tr>
            <td>${toFa(rowIdx++)}</td>
            <td><b>${a.type==='bank'?'۱۰۲۰۱':'۱۰۱۰۱'}</b></td>
            <td><b>موجودی نقد و بانک — ${a.name}</b></td>
            <td>مانده اولیه افتتاحیه حساب ${a.type==='bank'?'بانکی':'صندوق'}</td>
            <td><b>${toFa(a.initialBalance)}</b></td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          </tr>
        `;
      }
    });

    // 2. Customers
    (db.customers || []).forEach(c => {
      if(c.initialTomanBalance > 0){
        totalDebitRial += c.initialTomanBalance;
        articlesHtml += `
          <tr>
            <td>${toFa(rowIdx++)}</td>
            <td><b>۱۰۳۰۱</b></td>
            <td><b>حساب‌های دریافتنی — ${c.name}</b></td>
            <td>مانده ریالی اول دوره طلب از مشتری</td>
            <td><b>${toFa(c.initialTomanBalance)}</b></td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
          </tr>
        `;
      } else if(c.initialTomanBalance < 0){
        const absVal = Math.abs(c.initialTomanBalance);
        totalCreditRial += absVal;
        articlesHtml += `
          <tr>
            <td>${toFa(rowIdx++)}</td>
            <td><b>۲۰۱۰۱</b></td>
            <td><b>حساب‌های پرداختنی — ${c.name}</b></td>
            <td>مانده ریالی اول دوره بستانکاری مشتری</td>
            <td>—</td>
            <td><b>${toFa(absVal)}</b></td>
            <td>—</td>
            <td>—</td>
          </tr>
        `;
      }

      if(c.initialGoldBalance > 0){
        totalDebitGold += c.initialGoldBalance;
        articlesHtml += `
          <tr>
            <td>${toFa(rowIdx++)}</td>
            <td><b>۱۰۳۰۲</b></td>
            <td><b>حساب‌های دریافتنی وزنی طلا — ${c.name}</b></td>
            <td>مانده طلای طلب اول دوره از همکار/مشتری</td>
            <td>—</td>
            <td>—</td>
            <td><b>${toFa(c.initialGoldBalance.toFixed(3))}</b></td>
            <td>—</td>
          </tr>
        `;
      } else if(c.initialGoldBalance < 0){
        const absGold = Math.abs(c.initialGoldBalance);
        totalCreditGold += absGold;
        articlesHtml += `
          <tr>
            <td>${toFa(rowIdx++)}</td>
            <td><b>۲۰۱۰۲</b></td>
            <td><b>حساب‌های پرداختنی وزنی طلا — ${c.name}</b></td>
            <td>مانده طلای بستانکاری اول دوره همکار/مشتری</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td><b>${toFa(absGold.toFixed(3))}</b></td>
          </tr>
        `;
      }
    });

    // 3. Stock Gold
    let totalStockGold = 0;
    (db.stock || []).forEach(s => { totalStockGold += (s.weight || 0); });
    if(totalStockGold > 0){
      totalDebitGold += totalStockGold;
      articlesHtml += `
        <tr>
          <td>${toFa(rowIdx++)}</td>
          <td><b>۱۱۱۰۱</b></td>
          <td><b>موجودی طلای ساخته‌شده و آبشده ویترین / گاوصندوق</b></td>
          <td>موجودی فیزیکی طلای ۱۸ عیار اول دوره</td>
          <td>—</td>
          <td>—</td>
          <td><b>${toFa(totalStockGold.toFixed(3))}</b></td>
          <td>—</td>
        </tr>
      `;
    }

    // 4. Balancing Capital (سرمایه اول دوره)
    const diffRial = totalDebitRial - totalCreditRial;
    if(diffRial > 0){
      totalCreditRial += diffRial;
      articlesHtml += `
        <tr>
          <td>${toFa(rowIdx++)}</td>
          <td><b>۹۰۱۰۱</b></td>
          <td><b>سرمایه اول دوره (حقوق صاحبان سهام / آورده نقدی)</b></td>
          <td>تراز سرمایه اولیه ریالی افتتاحیه</td>
          <td>—</td>
          <td><b>${toFa(Math.round(diffRial))}</b></td>
          <td>—</td>
          <td>—</td>
        </tr>
      `;
    }
    const diffGold = totalDebitGold - totalCreditGold;
    if(diffGold > 0){
      totalCreditGold += diffGold;
      articlesHtml += `
        <tr>
          <td>${toFa(rowIdx++)}</td>
          <td><b>۹۰۱۰۲</b></td>
          <td><b>سرمایه اول دوره وزنی طلا (آورده طلای اولیه)</b></td>
          <td>تراز سرمایه وزنی طلای افتتاحیه</td>
          <td>—</td>
          <td>—</td>
          <td>—</td>
          <td><b>${toFa(diffGold.toFixed(3))}</b></td>
        </tr>
      `;
    }
  }

  body.innerHTML = `
    <div style="border:1px solid var(--border); border-radius:10px; padding:16px; background:var(--bg);">
      <!-- Header -->
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--gold-bright); padding-bottom:12px; margin-bottom:14px;">
        <div>
          <div style="font-size:18px; font-weight:900; color:var(--gold-bright); display:flex; align-items:center; gap:8px;">
            <span>⚖️</span> کوشا — سند رسمی حسابداری دوبل
          </div>
          <div style="font-size:12px; color:var(--text-faint); margin-top:2px;">
            سامانه جامع حسابداری طلا و جواهر کوشا
          </div>
        </div>
        <div style="text-align:left; font-size:12px; line-height:1.8;">
          <div>شماره ثابت سیستم: <span class="badge-doc-perm">${toFa(doc.permanentId)}</span> <small style="opacity:0.75;">(ثابت 🔒)</small></div>
          <div>شماره سند حسابداری: <span class="badge-doc-num">#${toFa(doc.documentNumber)}</span> ${doc.sourceType !== 'opening' ? `<button class="btn btn-sm" style="padding:1px 8px; font-size:11px; margin-right:4px;" onclick="closeVoucherDetailModal(); editDocumentBySource('${doc.sourceType}', '${doc.sourceId}')">✏️ ویرایش سند</button>` : '<small style="opacity:0.75;">(سند افتتاحیه)</small>'}</div>
          <div>شماره فاکتور: ${doc.invoiceNumber ? `<span class="badge-inv-num">${toFa(doc.invoiceNumber)}</span>` : '<span style="color:var(--text-faint);">— (ندارد)</span>'}</div>
          <div>تاریخ سند: <b>${doc.date ? new Date(doc.date).toLocaleDateString('fa-IR') : '—'}</b></div>
        </div>
      </div>

      <!-- General Info -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; background:var(--elev); padding:10px 14px; border-radius:8px; margin-bottom:14px; font-size:12px;">
        <div>نوع سند: <span class="badge ${doc.badgeCls}"><span class="dot"></span>${doc.typeLabel}</span></div>
        <div>طرف حساب: <b>${doc.customerName || 'عمومی'}</b></div>
        <div>شرح کلی: <b>${doc.description}</b></div>
        <div>وضعیت موازنه: <b style="color:var(--success);">🟢 تراز و معتبر</b></div>
      </div>

      <!-- Journal Entries (Articles) -->
      <div style="font-weight:700; font-size:12.5px; margin-bottom:6px; color:var(--gold-bright);">📑 آرتیکل‌های حسابداری (ثبت دوطرفه):</div>
      <table style="width:100%; font-size:12px; margin-bottom:12px;">
        <thead>
          <tr>
            <th style="width:30px;">#</th>
            <th style="width:65px;">کد حساب</th>
            <th>عنوان حساب معین / تفصیلی</th>
            <th>شرح آرتیکل</th>
            <th style="width:110px;">بدهکار (ریال)</th>
            <th style="width:110px;">بستانکار (ریال)</th>
            <th style="width:80px;">بد طلا (g)</th>
            <th style="width:80px;">بس طلا (g)</th>
          </tr>
        </thead>
        <tbody>
          ${articlesHtml}
        </tbody>
        <tfoot>
          <tr style="background:rgba(212,175,55,0.1); font-weight:800; border-top:2px solid var(--gold-bright);">
            <td colspan="4" style="text-align:left;">جمع کل تراز سند:</td>
            <td>${toFa(Math.round(totalDebitRial))}</td>
            <td>${toFa(Math.round(totalCreditRial))}</td>
            <td>${totalDebitGold > 0 ? toFa(totalDebitGold.toFixed(3)) : '—'}</td>
            <td>${totalCreditGold > 0 ? toFa(totalCreditGold.toFixed(3)) : '—'}</td>
          </tr>
        </tfoot>
      </table>

      ${extraDetailHtml}

      <!-- Signatures Footer -->
      <div style="margin-top:24px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:16px; border-top:1px dashed var(--border); padding-top:16px; font-size:11px; text-align:center; color:var(--text-faint);">
        <div>
          <div>تنظیم‌کننده سند:</div>
          <div style="margin-top:25px; border-bottom:1px dotted var(--border);"></div>
        </div>
        <div>
          <div>تایید حسابداری / ممیزی:</div>
          <div style="margin-top:25px; border-bottom:1px dotted var(--border);"></div>
        </div>
        <div>
          <div>امضای طرف حساب / مشتری:</div>
          <div style="margin-top:25px; border-bottom:1px dotted var(--border);"></div>
        </div>
      </div>
    </div>
  `;

  overlay.style.display = 'flex';
}

function closeVoucherModal(){
  const overlay = document.getElementById('voucher-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  activeVoucherId = null;
  activeVoucherSourceType = null;
}

function printVoucher(){
  window.print();
}

function printVouchersList(){
  window.print();
}

/* ============ manual journal form ============ */
function populateManualJournalAccounts(){
  const debitSel = document.getElementById('manual-debit-account');
  const creditSel = document.getElementById('manual-credit-account');
  if(!debitSel || !creditSel) return;

  const options = [];
  // Accounts (Bank / Cash)
  db.financialAccounts.forEach(a => {
    options.push({ val: 'fa_' + a.id, label: `حساب ${a.type==='bank'?'بانک':'صندوق'}: ${a.name}` });
  });
  // COA Nodes
  db.coaNodes.forEach(n => {
    if(!nodeChildren(n).length){
      options.push({ val: 'coa_' + n.id, label: `سرفصل (${n.code}): ${n.name}` });
    }
  });
  // Customers
  db.customers.forEach(c => {
    options.push({ val: 'cust_' + c.id, label: `شخص / مشتری: ${c.name}` });
  });

  const html = options.map(o => `<option value="${o.val}">${o.label}</option>`).join('');
  debitSel.innerHTML = `<option value="">— انتخاب سرفصل / حساب بدهکار —</option>` + html;
  creditSel.innerHTML = `<option value="">— انتخاب سرفصل / حساب بستانکار —</option>` + html;
}

function openManualJournalForm(id){
  editingManualJournalId = id || null;
  const overlay = document.getElementById('manual-voucher-modal-overlay');
  if(overlay) overlay.style.display = 'flex';

  populateManualJournalAccounts();

  const numInput = document.getElementById('manual-doc-num');
  const permInput = document.getElementById('manual-doc-perm');
  const dateInput = document.getElementById('manual-doc-date');
  const refInput = document.getElementById('manual-doc-ref');
  const amtInput = document.getElementById('manual-doc-amount');
  const goldInput = document.getElementById('manual-doc-gold');
  const custInput = document.getElementById('manual-doc-customer');
  const custDisplay = document.getElementById('manual-doc-customer-display');
  const descInput = document.getElementById('manual-doc-desc');
  const titleEl = document.getElementById('manual-voucher-title');
  const saveBtn = document.getElementById('manual-doc-save-btn');

  if(editingManualJournalId){
    const mj = (db.manualJournals || []).find(x => x.id === editingManualJournalId);
    if(mj){
      if(titleEl) titleEl.textContent = `⚖️ ویرایش سند حسابداری شماره #${toFa(mj.documentNumber)}`;
      if(permInput) permInput.value = toFa(mj.permanentId || 2) + ' (ثابت و غیرقابل ویرایش 🔒)';
      if(numInput) numInput.value = mj.documentNumber;
      if(dateInput) dateInput.value = mj.date ? toDateInputValue(mj.date) : toDateInputValue(new Date());
      if(refInput) refInput.value = mj.refNumber || '';
      if(amtInput) amtInput.value = fmtMoneyInput(mj.amount);
      if(goldInput) goldInput.value = mj.goldWeight || '';
      if(custInput) custInput.value = mj.customerId || '';
      const cust = db.customers.find(c => c.id === mj.customerId);
      if(custDisplay) custDisplay.value = cust ? cust.name : '';
      if(descInput) descInput.value = mj.description || '';
      if(document.getElementById('manual-debit-account')) document.getElementById('manual-debit-account').value = mj.debitAccountId || '';
      if(document.getElementById('manual-credit-account')) document.getElementById('manual-credit-account').value = mj.creditAccountId || '';
    }
    if(saveBtn) saveBtn.textContent = 'بروزرسانی سند';
  } else {
    if(titleEl) titleEl.textContent = '⚖️ ثبت سند حسابداری دستی (دوطرفه طلا و ریال)';
    if(permInput) permInput.value = toFa(getNextPermanentId()) + ' (تخصیص خودکار سیستم)';
    if(numInput) numInput.value = getNextDocumentNumber();
    if(dateInput) dateInput.value = toDateInputValue(new Date());
    if(refInput) refInput.value = '';
    if(amtInput) amtInput.value = '';
    if(goldInput) goldInput.value = '';
    if(custInput) custInput.value = '';
    if(custDisplay) custDisplay.value = '';
    if(descInput) descInput.value = '';
    if(saveBtn) saveBtn.textContent = 'ذخیره سند حسابداری';
  }
}

function closeManualJournalForm(){
  const overlay = document.getElementById('manual-voucher-modal-overlay');
  if(overlay) overlay.style.display = 'none';
  editingManualJournalId = null;
}

function saveManualJournal(){
  const dateVal = document.getElementById('manual-doc-date').value;
  const refNumber = document.getElementById('manual-doc-ref').value.trim();
  const debitAccountId = document.getElementById('manual-debit-account').value;
  const creditAccountId = document.getElementById('manual-credit-account').value;
  const amount = currencyValue(document.getElementById('manual-doc-amount'));
  const goldWeight = Number(document.getElementById('manual-doc-gold').value || 0);
  const customerId = document.getElementById('manual-doc-customer').value || null;
  const description = document.getElementById('manual-doc-desc').value.trim();
  const docNumInput = document.getElementById('manual-doc-num');

  if(!debitAccountId || !creditAccountId){
    toast('لطفاً هر دو سرفصل بدهکار و بستانکار را مشخص کنید');
    return;
  }
  if(!amount && !goldWeight){
    toast('حداقل یکی از گردش‌های ریالی یا وزنی طلا باید وارد شود');
    return;
  }
  if(!description){
    toast('شرح و بابت سند الزامی است');
    return;
  }

  let docNum = parseInt(toEn(docNumInput?.value || ''), 10);
  if(isNaN(docNum) || docNum <= 0){
    docNum = getNextDocumentNumber();
  }
  if(docNum === 1){
    toast('شماره سند ۱ مختص سند افتتاحیه است و قابل تخصیص به سایر اسناد نیست', 'error');
    return;
  }
  if(isDocumentNumberDuplicate(docNum, editingManualJournalId || undefined, 'manual')){
    toast(`شماره سند ${toFa(docNum)} تکراری است و قبلاً برای سند دیگری ثبت شده است`, 'error');
    return;
  }

  const debitSelect = document.getElementById('manual-debit-account');
  const creditSelect = document.getElementById('manual-credit-account');
  const debitAccountName = debitSelect.options[debitSelect.selectedIndex]?.text || 'حساب بدهکار';
  const creditAccountName = creditSelect.options[creditSelect.selectedIndex]?.text || 'حساب بستانکار';

  if(!db.manualJournals) db.manualJournals = [];

  if(editingManualJournalId){
    const mj = db.manualJournals.find(x => x.id === editingManualJournalId);
    if(mj){
      mj.documentNumber = docNum;
      mj.date = dateVal ? new Date(dateVal + 'T00:00:00').toISOString() : nowISO();
      mj.refNumber = refNumber;
      mj.debitAccountId = debitAccountId;
      mj.debitAccountName = debitAccountName;
      mj.creditAccountId = creditAccountId;
      mj.creditAccountName = creditAccountName;
      mj.amount = amount;
      mj.goldWeight = goldWeight;
      mj.customerId = customerId;
      mj.description = description;
      mj.updated_at = nowISO();
      addLog(`سند حسابداری دستی #${mj.documentNumber} ویرایش شد`);
      toast('سند حسابداری بروزرسانی شد');
    }
  } else {
    const permId = getNextPermanentId();
    const newDoc = {
      id: uuid(),
      permanentId: permId,
      documentNumber: docNum,
      date: dateVal ? new Date(dateVal + 'T00:00:00').toISOString() : nowISO(),
      refNumber,
      debitAccountId,
      debitAccountName,
      creditAccountId,
      creditAccountName,
      amount,
      goldWeight,
      customerId,
      description,
      updated_at: nowISO(),
      is_synced: false
    };
    db.manualJournals.push(newDoc);
    addLog(`سند حسابداری دستی شماره #${docNum} ثبت شد`);
    toast('سند حسابداری دستی با موفقیت ثبت شد');
  }

  persist('manualJournals');
  closeManualJournalForm();
  renderVouchersTable();
}

function deleteManualJournal(id){
  const mj = (db.manualJournals || []).find(x => x.id === id);
  if(!mj) return;
  showConfirmModal({
    title: `حذف سند دستی #${mj.documentNumber}`,
    message: `آیا از حذف سند دستی #${mj.documentNumber} (${mj.description}) اطمینان دارید؟`,
    isDanger: true,
    confirmText: 'بله، حذف شود',
    onConfirm: () => {
      db.manualJournals = db.manualJournals.filter(x => x.id !== id);
      persist('manualJournals');
      addLog(`سند دستی #${mj.documentNumber} حذف شد`);
      toast('سند دستی حذف شد');
      renderVouchersTable();
    }
  });
}

function deleteInvoice(id){
  const inv = db.invoices.find(i => i.id === id);
  if(!inv) return;
  showConfirmModal({
    title: `حذف فاکتور #${inv.number}`,
    message: `آیا از حذف فاکتور #${inv.number} به مبلغ ${toFa(inv.total)} ریال اطمینان دارید؟\nتمام اثرات حسابداری و تراز شخص برگشت خواهد خورد.`,
    isDanger: true,
    confirmText: 'بله، حذف و برگشت تراز',
    onConfirm: () => {
      // Revert customer balance
      if(inv.customerId){
        const cust = db.customers.find(c => c.id === inv.customerId);
        if(cust){
          if(inv.type === 'sell'){
            if(inv.accountMode === 'gold'){
              cust.goldBalance18 -= (inv.karatWeightSum || 0);
            } else {
              cust.tomanBalance -= (inv.total || 0);
            }
          } else if(inv.type === 'buy'){
            if(inv.accountMode === 'gold'){
              cust.goldBalance18 += (inv.karatWeightSum || 0);
            } else {
              cust.tomanBalance += (inv.total || 0);
            }
          } else if(inv.type === 'exchange'){
            if(inv.accountMode === 'gold'){
              cust.goldBalance18 -= (inv.diffWeight18 || 0);
            } else {
              cust.tomanBalance -= (inv.total || 0);
            }
          }
          cust.updated_at = nowISO();
          cust.is_synced = false;
          persist('customers');
        }
      }

      // Remove linked settlements / checks
      db.financialTransactions = db.financialTransactions.filter(t => t.invoiceId !== id);
      db.checks = db.checks.filter(c => c.invoiceId !== id);
      persist('financialTransactions');
      persist('checks');

      db.invoices = db.invoices.filter(i => i.id !== id);
      persist('invoices');

      addLog(`فاکتور #${inv.number} حذف شد و ترازهای مالی برگشت داده شدند`);
      toast(`فاکتور #${inv.number} حذف شد`);

      renderDashboard();
      renderReports();
      renderVouchersTable();
    }
  });
}

function deleteTransaction(id){
  const t = db.financialTransactions.find(x => x.id === id);
  if(!t) return;
  showConfirmModal({
    title: 'حذف تراکنش مالی',
    message: `آیا از حذف تراکنش به مبلغ ${toFa(t.amount)} ریال اطمینان دارید؟`,
    isDanger: true,
    confirmText: 'بله، حذف شود',
    onConfirm: () => {
      if(t.customerId){
        const cust = db.customers.find(c => c.id === t.customerId);
        if(cust){
          if(t.kind === 'deposit'){
            cust.tomanBalance += t.amount;
          } else {
            cust.tomanBalance -= t.amount;
          }
          cust.updated_at = nowISO();
          persist('customers');
        }
      }

      if(t.method === 'check' && t.checkId){
        const chk = db.checks.find(c => c.id === t.checkId);
        if(chk){
          chk.status = 'in_hand';
          persist('checks');
        }
      }

      db.financialTransactions = db.financialTransactions.filter(x => x.id !== id);
      persist('financialTransactions');
      addLog(`تراکنش مالی حذف شد`);
      toast('تراکنش مالی حذف شد');
      renderTransactions();
      renderVouchersTable();
    }
  });
}

function deleteCheck(id){
  const c = db.checks.find(x => x.id === id);
  if(!c) return;
  showConfirmModal({
    title: `حذف چک شماره ${c.number}`,
    message: `آیا از حذف چک شماره ${c.number} به مبلغ ${toFa(c.amount)} ریال اطمینان دارید؟`,
    isDanger: true,
    confirmText: 'بله، حذف شود',
    onConfirm: () => {
      db.checks = db.checks.filter(x => x.id !== id);
      persist('checks');
      addLog(`چک شماره ${c.number} حذف شد`);
      toast('چک حذف شد');
      renderChecks();
      renderVouchersTable();
    }
  });
}

function deleteAccountingDocument(sourceType: string, id: string){
  if(sourceType === 'opening'){
    toast('سند افتتاحیه مبنای سیستم است و قابل حذف نیست. برای تغییر مانده‌ها به بخش اطلاعات پایه > افتتاحیه مراجعه فرمایید.', 'warn');
    return;
  }
  if(sourceType === 'invoice'){
    deleteInvoice(id);
  } else if(sourceType === 'expense' || sourceType === 'income' || sourceType === 'expense_return' || sourceType === 'income_return'){
    deleteExpenseIncome(id);
    renderVouchersTable();
  } else if(sourceType === 'transaction' || sourceType === 'deposit' || sourceType === 'payment'){
    deleteTransaction(id);
  } else if(sourceType === 'check' || sourceType === 'check_received' || sourceType === 'check_issued'){
    deleteCheck(id);
  } else if(sourceType === 'manual'){
    deleteManualJournal(id);
  }
}

function editDocumentBySource(sourceType: string, id: string){
  if(sourceType === 'opening'){
    go('baseinfo');
    setTimeout(() => {
      if(typeof switchBaseInfoTab === 'function') switchBaseInfoTab('opening');
    }, 50);
    toast('برای ویرایش سند افتتاحیه، مانده‌های اولیه را در این بخش اصلاح نمایید.');
    return;
  }
  if(sourceType === 'invoice'){
    editInvoice(id);
  } else if(sourceType === 'expense' || sourceType === 'income' || sourceType === 'expense_return' || sourceType === 'income_return'){
    const item = (db.expensesIncomes || []).find(x => x.id === id);
    openExpenseIncomeForm(item ? item.type : 'expense', id);
  } else if(sourceType === 'transaction' || sourceType === 'deposit' || sourceType === 'payment'){
    openTxnForm(id);
  } else if(sourceType === 'check' || sourceType === 'check_received' || sourceType === 'check_issued'){
    openCheckForm(id);
  } else if(sourceType === 'manual'){
    openManualJournalForm(id);
  }
}

function quickEditDocumentNumber(sourceType: string, id: string){
  // Document numbers are only editable from within the document form during creation or edit
  editDocumentBySource(sourceType, id);
}

/* ============ sync ============ */
function addLog(text){
  db.log.unshift({ text, time: nowISO() });
  db.log = db.log.slice(0, 40);
  persist('log');
}

function renderSync(){
  const wrap = document.getElementById('sync-log');
  if(!wrap) return;
  wrap.innerHTML = '';
  document.getElementById('sync-log-empty').style.display = db.log.length ? 'none' : 'block';
  db.log.forEach(item => {
    const el = document.createElement('div');
    el.className = 'log-item';
    el.innerHTML = `<span class="log-time">${new Date(item.time).toLocaleTimeString('fa-IR')}</span><span>${item.text}</span>`;
    wrap.appendChild(el);
  });
  const lastSync = localStorage.getItem('gold_last_sync');
  document.getElementById('sync-last').textContent = 'آخرین بار: ' + (lastSync ? new Date(lastSync).toLocaleString('fa-IR') : '—');
}

function runSync(){
  const pendingBefore = countPendingSync();
  if(pendingBefore === 0){
    toast('تمام اطلاعات همگام هستند');
    return;
  }

  document.getElementById('sync-status').textContent = '🟡 در حال ارسال اطلاعات به سرور...';
  setTimeout(() => {
    [db.customers, db.inventory, db.invoices, db.financialAccounts, db.checks, db.financialTransactions, db.expensesIncomes, db.manualJournals].forEach(list => {
      if(list) list.forEach(r => { if(!r.is_synced) r.is_synced = true; });
    });
    persist('customers');
    persist('inventory');
    persist('invoices');
    persist('financialAccounts');
    persist('checks');
    persist('financialTransactions');
    persist('expensesIncomes');
    persist('manualJournals');

    localStorage.setItem('gold_last_sync', nowISO());
    addLog(`${toFa(pendingBefore)} رکورد با موفقیت با سرور مرکزی همگام‌سازی شد`);
    document.getElementById('sync-status').textContent = '🟢 همگام با سرور';
    renderSync();
    renderDashboard();
    toast('همگام‌سازی انجام شد');
  }, 800);
}

/* ============ attach to window for inline events ============ */
(window as any).customersActiveBranch = customersActiveBranch;
(window as any).custPickerTargetBranch = custPickerTargetBranch;
Object.assign(window, {
  go, newInvoice, editInvoice,
  switchBaseInfoTab, switchBaseTab: switchBaseInfoTab, saveFiscalYearStart, saveOpeningCustomerBalance, saveOpeningAccountBalance,
  toggleCoaNode, deleteCoaGenericDetail, deleteCoaNode, renameCoaNode,
  openCoaBrowser, openCoaBrowserAtNode, closeCoaBrowser, coaBrowserNavigateInto, coaBrowserGoBack, coaBrowserSaveCategory,
  switchCustomersBranch, openCustomerForm, closeCustomerForm, closeCustomerFormWithConfirm, saveCustomer, sortCustomersBy, onCustBranchChange,
  toggleCustomerFormMaximize, switchCustomerFormTab, stepCustomerFormTab, syncModalOpenState,
  onCustomerNameInput, selectCustomerNameSuggestion, hideCustomerNameSuggestions,
  populateCustomerCategorySelect, onCustomerCategorySelectChange, promptQuickCreateCategory, promptRenameCustomerCategory, promptDeleteCustomerCategory,
  openNewCustomerFlow, openCustCategoryPicker, closeCustCategoryPicker, selectCustCategoryAndProceed, saveNewCategoryFromPicker,
  updateCustomerFormPath, openCategoryPickerFromCustomerForm, filterCustomersByCategory,
  openItemForm, closeItemForm, saveItem, deleteItemAction, deleteItemFromModal, onItemPhotoChange, clearItemPhoto, sortInventoryBy, toggleColumnsPanel, toggleColumn, flattenCategoryOptions,
  saveSettings,
  switchInvoiceMode, onInvoiceTypeSelectChange,
  addInvoiceLine, removeInvoiceLine, updateLineWeight, updateLine, updateLineName,
  addExchangeBuyLine, removeExchangeBuyLine, updateExchangeLine, updateExchangeLineName, updateExchangeLineWeight,
  openKardexModal, closeKardexModal, renderKardexModalList, handleKardexModalKeydown, pickFromKardexModal, manualEntryFromModal, unlinkInvoiceItem,
  openCustomerModal, closeCustomerModal, renderCustomerModalList, handleCustomerModalKeydown, pickFromCustomerModal,
  addSettlementLine, removeSettlementLine, updateSettlementMethod, updateSettlement,
  submitInvoice, renderInvoiceSummary,
  renderReports,
  switchFinanceTab, openAccountForm, closeAccountForm, onAccountTypeChange, saveAccount,
  openCheckForm, closeCheckForm, saveCheck, setCheckStatus,
  openTxnForm, closeTxnForm, saveTransaction, populateTxnAccountSelect,
  renderExpenses, switchExpenseIncomeTab, openExpenseIncomeForm, closeExpenseIncomeForm,
  onExpenseIncomeTypeChange, onExpenseIncomePaymentMethodChange, saveExpenseIncome, deleteExpenseIncome,
  renderExpensesIncomesTable, renderExpenseCategoriesView, promptAddCategory,
  renderVouchersView, renderVouchersTable, openVoucherDetailModal, closeVoucherModal, printVoucher, printVouchersList,
  openManualJournalForm, closeManualJournalForm, saveManualJournal, deleteManualJournal,
  deleteInvoice, deleteTransaction, deleteCheck, deleteAccountingDocument, editDocumentBySource,
  selectCustomer, editSelectedCustomerAction, deleteCustomerAction, deleteCustomerFromModal, openCustomerStatementAction, openCustomerStatement,
  closeCustomerStatement, printCustomerStatement, renderCustomerStatementContent, onStatementRangeChange, resetCustomerStatementFilters,
  selectStatementRow, editSelectedStatementDocument, viewSelectedStatementDocInVouchers, viewSelectedStatementDoubleEntry, viewStatementDocInVouchers,
  setStatementViewMode, toggleStatementGoldColumns,
  openCustomerLedgerInfoAction, openCustomerLedgerInfo, closeCustomerLedgerInfo, changeCustomerCategoryFromLedger,
  showConfirmModal, confirmModal: showConfirmModal, closeConfirmModal,
  showPromptModal, confirmPromptModal, closePromptModal,
  makeTableResizable, initAllTableResizers,
  runSync, formatCurrencyInput, toFa, escapeHtml, escapeForJs,
  toggleSidebarCollapse,
  showNavFlyout, hideNavFlyout,
  openInvoiceWithMode, openCustomersWithBranch, openFinanceWithTab, openExpensesWithTab, openBaseInfoWithTab,
  promptAddItemCategory, filterInventoryByCategory, onInventoryCategoryFilterChange,
  promptAddExpenseCategory, filterExpensesByCategory, onExpenseCategoryFilterChange,
  onCustomerGroupFilterChange,
  downloadOfflineHtml
});

function downloadOfflineHtml(){
  try {
    const link = document.createElement('a');
    link.href = '/gold-accounting-app.html';
    link.download = 'koosha-gold-accounting-offline.html';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('دانلود فایل نسخه آفلاین (HTML) آغاز شد', 'success');
  } catch(e) {
    window.location.href = '/gold-accounting-app.html';
  }
}


/* ============ sidebar collapse ============ */
function toggleSidebarCollapse(){
  const sb = document.querySelector('.sidebar');
  if(!sb) return;
  const isCol = sb.classList.toggle('collapsed');
  try {
    localStorage.setItem('sidebar_collapsed', isCol ? '1' : '0');
  } catch(e){}
  const btn = document.getElementById('sidebar-toggle-btn');
  if(btn){
    btn.setAttribute('title', isCol ? 'باز کردن منو' : 'کوچک‌سازی منو');
  }
  hideNavFlyout();
}

function toggleAppSidebar(){
  toggleSidebarCollapse();
}

function initSidebarState(){
  try {
    if(localStorage.getItem('sidebar_collapsed') === '1'){
      const sb = document.querySelector('.sidebar');
      if(sb) sb.classList.add('collapsed');
      const btn = document.getElementById('sidebar-toggle-btn');
      if(btn) btn.setAttribute('title', 'باز کردن منو');
    }
  } catch(e){}
}

/* ============ navigation flyout popover ============ */
interface NavSubmenuItem {
  icon: string;
  name: string;
  isActive?: () => boolean;
  action: () => void;
}

interface NavSubmenuConfig {
  items: NavSubmenuItem[];
}

function isCurrentView(viewKey: string){
  const activeViewEl = document.querySelector('.view.active');
  return activeViewEl?.id === `view-${viewKey}`;
}

function openInvoiceWithMode(mode: 'sell' | 'buy' | 'exchange' = 'sell'){
  go('invoice');
  newInvoice(mode);
  switchInvoiceMode(mode);
}

function openCustomersWithBranch(branch: 'main' | 'other' | 'staff' = 'main'){
  go('customers');
  switchCustomersBranch(branch);
}

function openFinanceWithTab(tab: 'accounts' | 'checks' | 'transactions' = 'accounts'){
  go('finance');
  switchFinanceTab(tab);
}

function openExpensesWithTab(tab: 'expense' | 'income' = 'expense', subView: 'list' | 'accounts' = 'list'){
  go('expenses');
  activeExpenseTab = tab;
  activeExpenseSubView = subView;
  switchExpenseIncomeTab(tab, subView);
}

function openBaseInfoWithTab(tab: 'opening' | 'coding' = 'opening'){
  go('baseinfo');
  switchBaseInfoTab(tab);
}

const NAV_SUBMENUS: Record<string, NavSubmenuConfig> = {
  invoice: {
    items: [
      {
        icon: '✨',
        name: 'فاکتور فروش',
        isActive: () => isCurrentView('invoice') && activeInvoiceMode === 'sell',
        action: () => openInvoiceWithMode('sell')
      },
      {
        icon: '📥',
        name: 'فاکتور خرید',
        isActive: () => isCurrentView('invoice') && activeInvoiceMode === 'buy',
        action: () => openInvoiceWithMode('buy')
      },
      {
        icon: '🔄',
        name: 'فاکتور تعویض',
        isActive: () => isCurrentView('invoice') && activeInvoiceMode === 'exchange',
        action: () => openInvoiceWithMode('exchange')
      }
    ]
  },
  customers: {
    items: [
      {
        icon: '👥',
        name: 'اشخاص اصلی',
        isActive: () => isCurrentView('customers') && customersActiveBranch === 'main',
        action: () => openCustomersWithBranch('main')
      },
      {
        icon: '🏢',
        name: 'سایر اشخاص',
        isActive: () => isCurrentView('customers') && customersActiveBranch === 'other',
        action: () => openCustomersWithBranch('other')
      },
      {
        icon: '👔',
        name: 'پرسنل',
        isActive: () => isCurrentView('customers') && customersActiveBranch === 'staff',
        action: () => openCustomersWithBranch('staff')
      }
    ]
  },
  finance: {
    items: [
      {
        icon: '🏛️',
        name: 'حساب‌ها و صندوق‌ها',
        isActive: () => isCurrentView('finance') && activeFinanceTab === 'accounts',
        action: () => openFinanceWithTab('accounts')
      },
      {
        icon: '📑',
        name: 'مدیریت چک‌ها',
        isActive: () => isCurrentView('finance') && activeFinanceTab === 'checks',
        action: () => openFinanceWithTab('checks')
      },
      {
        icon: '💳',
        name: 'واریز و پرداخت',
        isActive: () => isCurrentView('finance') && activeFinanceTab === 'transactions',
        action: () => openFinanceWithTab('transactions')
      }
    ]
  },
  expenses: {
    items: [
      {
        icon: '🔴',
        name: 'هزینه‌ها',
        isActive: () => isCurrentView('expenses') && activeExpenseTab === 'expense' && activeExpenseSubView === 'list',
        action: () => openExpensesWithTab('expense', 'list')
      },
      {
        icon: '🏛️',
        name: 'حساب‌های هزینه',
        isActive: () => isCurrentView('expenses') && activeExpenseTab === 'expense' && activeExpenseSubView === 'accounts',
        action: () => openExpensesWithTab('expense', 'accounts')
      },
      {
        icon: '🟢',
        name: 'درآمدها',
        isActive: () => isCurrentView('expenses') && activeExpenseTab === 'income' && activeExpenseSubView === 'list',
        action: () => openExpensesWithTab('income', 'list')
      },
      {
        icon: '🏛️',
        name: 'حساب‌های درآمد',
        isActive: () => isCurrentView('expenses') && activeExpenseTab === 'income' && activeExpenseSubView === 'accounts',
        action: () => openExpensesWithTab('income', 'accounts')
      }
    ]
  },
  vouchers: {
    items: [
      {
        icon: '📋',
        name: 'دفتر روزنامه اسناد',
        isActive: () => isCurrentView('vouchers'),
        action: () => go('vouchers')
      },
      {
        icon: '⚖️',
        name: 'سند حسابداری دستی',
        action: () => { go('vouchers'); openManualJournalForm(); }
      }
    ]
  },
  baseinfo: {
    items: [
      {
        icon: '📅',
        name: 'دوره مالی و افتتاحیه',
        isActive: () => isCurrentView('baseinfo') && activeBaseInfoTab === 'opening',
        action: () => openBaseInfoWithTab('opening')
      },
      {
        icon: '🗂️',
        name: 'کدبندی دفاتر (کل و معین)',
        isActive: () => isCurrentView('baseinfo') && activeBaseInfoTab === 'coding',
        action: () => openBaseInfoWithTab('coding')
      },
      {
        icon: '⚙️',
        name: 'تنظیمات و نرخ روز',
        isActive: () => isCurrentView('settings'),
        action: () => go('settings')
      }
    ]
  }
};

let activeFlyoutView: string | null = null;

function showNavFlyout(viewKey: string, triggerEl: HTMLElement){
  const cfg = NAV_SUBMENUS[viewKey];
  const popover = document.getElementById('nav-flyout-popover');
  if(!cfg || !popover) return;

  activeFlyoutView = viewKey;
  
  // Highlight the triggering nav-item
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('popover-open'));
  triggerEl.classList.add('popover-open');

  const itemsEl = document.getElementById('nav-flyout-items');
  if(itemsEl){
    itemsEl.innerHTML = cfg.items.map((item, idx) => {
      const activeClass = (item.isActive && item.isActive()) ? ' active' : '';
      return `
        <div class="nav-flyout-item${activeClass}" data-flyout-idx="${idx}">
          <span class="nav-flyout-item-icon">${item.icon}</span>
          <span>${item.name}</span>
        </div>
      `;
    }).join('');

    // Attach click events to options
    itemsEl.querySelectorAll('.nav-flyout-item').forEach(itemEl => {
      itemEl.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const idx = Number(itemEl.getAttribute('data-flyout-idx') || '0');
        const itemObj = cfg.items[idx];
        hideNavFlyout();
        if(itemObj && typeof itemObj.action === 'function'){
          itemObj.action();
        }
      });
    });
  }

  // Display popover to compute dimensions
  popover.style.display = 'flex';
  popover.classList.add('active');

  // Position relative to trigger
  const rect = triggerEl.getBoundingClientRect();
  const popoverHeight = popover.offsetHeight || 120;

  // In RTL, sidebar is docked to the right edge of viewport.
  // The popover should sit at rect.left - popoverWidth - gap
  const rightVal = (window.innerWidth - rect.left + 8);
  
  // Vertical alignment
  let topVal = rect.top;
  if(topVal + popoverHeight > window.innerHeight - 15){
    topVal = Math.max(10, window.innerHeight - popoverHeight - 15);
  }

  popover.style.right = `${rightVal}px`;
  popover.style.top = `${topVal}px`;
  popover.style.left = 'auto';
}

function hideNavFlyout(){
  const popover = document.getElementById('nav-flyout-popover');
  if(popover){
    popover.classList.remove('active');
    popover.style.display = 'none';
  }
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('popover-open'));
  activeFlyoutView = null;
}

/* ============ init event listeners & render ============ */
initSidebarState();

// Handle main nav items with popovers
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', (e) => {
    const view = (n as HTMLElement).dataset.view;
    if(!view) return;

    if(NAV_SUBMENUS[view]){
      if(activeFlyoutView === view){
        // If the same right tab is already open, clicking it toggles and closes the frame
        hideNavFlyout();
      } else {
        showNavFlyout(view, n as HTMLElement);
      }
    } else {
      hideNavFlyout();
      go(view);
    }
  });
});

// Close popover when clicked anywhere except the flyout option items
document.addEventListener('click', (e) => {
  if(!activeFlyoutView) return;
  const target = e.target as HTMLElement | null;
  if(!target) return;

  // If clicked directly on or inside an option in the flyout, let the option click handler execute
  if(target.closest('.nav-flyout-item')){
    return;
  }

  // If clicked on the exact nav-item that opened this active flyout:
  // prevent default / stop propagation and close it cleanly
  const clickedNavItem = target.closest('.nav-item') as HTMLElement | null;
  if(clickedNavItem && clickedNavItem.dataset.view === activeFlyoutView){
    e.stopPropagation();
    e.preventDefault();
    hideNavFlyout();
    return;
  }

  // If clicked on another nav-item, hide current flyout and allow the new tab to process
  if(clickedNavItem){
    hideNavFlyout();
    return;
  }

  // If clicked anywhere else on the document (page content, table, header, cards, background, inputs, modals, etc.):
  hideNavFlyout();
}, true);

// Also close on pointerdown outside for instantaneous responsive dismissal
document.addEventListener('pointerdown', (e) => {
  if(!activeFlyoutView) return;
  const target = e.target as HTMLElement | null;
  if(!target) return;

  // Ignore if clicking on flyout option items
  if(target.closest('.nav-flyout-item')){
    return;
  }

  // Ignore if clicking on the nav-item tab itself (the click handler will handle toggling)
  const clickedNavItem = target.closest('.nav-item') as HTMLElement | null;
  if(clickedNavItem && clickedNavItem.dataset.view === activeFlyoutView){
    return;
  }

  // If clicking another nav item, let click handler run
  if(clickedNavItem){
    return;
  }

  // Otherwise, clicked anywhere else outside: immediately close the options window
  hideNavFlyout();
}, true);

// Close popover on resize or scroll
window.addEventListener('resize', () => {
  hideNavFlyout();
});
window.addEventListener('scroll', () => {
  if(activeFlyoutView){
    hideNavFlyout();
  }
}, { passive: true, capture: true });

// Close modals & popover on Escape key
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    if(activeFlyoutView){
      hideNavFlyout();
      return;
    }
    if(document.getElementById('app-prompt-modal')?.style.display === 'flex') closePromptModal(null);
    else if(document.getElementById('app-confirm-modal')?.style.display === 'flex') closeConfirmModal(false);
    else if(document.getElementById('customer-cat-picker-modal')?.style.display === 'flex') closeCustCategoryPicker();
    else if(document.getElementById('customer-form-modal-overlay')?.style.display === 'flex') closeCustomerFormWithConfirm();
    else if(document.getElementById('customer-statement-modal-overlay')?.style.display === 'flex') closeCustomerStatement();
    else if(document.getElementById('item-statement-modal-overlay')?.style.display === 'flex') closeItemStatement();
    else if(document.getElementById('customer-ledger-modal-overlay')?.style.display === 'flex') closeCustomerLedgerInfo();
    else if(document.getElementById('item-form-modal-overlay')?.style.display === 'flex') closeItemForm();
    else if(document.getElementById('account-form-modal-overlay')?.style.display === 'flex') closeAccountForm();
    else if(document.getElementById('check-form-modal-overlay')?.style.display === 'flex') closeCheckForm();
    else if(document.getElementById('txn-form-modal-overlay')?.style.display === 'flex') closeTxnForm();
    else if(document.getElementById('expense-income-modal-overlay')?.style.display === 'flex') closeExpenseIncomeForm();
    else if(document.getElementById('manual-voucher-modal-overlay')?.style.display === 'flex') closeManualJournalForm();
    else if(document.getElementById('voucher-modal-overlay')?.style.display === 'flex') closeVoucherModal();
    else if(document.getElementById('kardex-modal-overlay')?.style.display === 'flex') closeKardexModal();
    else if(document.getElementById('customer-modal-overlay')?.style.display === 'flex') closeCustomerModal();
    else if(document.getElementById('coa-browser-overlay')?.style.display === 'flex') closeCoaBrowser();
  }
});

ensureDocumentIdentifiers();
renderTicker();
renderDashboard();

// Expose functions globally for inline HTML event handlers
Object.assign(window, {
  go,
  setExpenseSubView,
  switchExpenseIncomeTab,
  openExpenseIncomeForm,
  closeExpenseIncomeForm,
  saveExpenseIncome,
  deleteExpenseIncome,
  promptAddCurrentCategory,
  promptAddExpenseCategory,
  deleteExpenseCategory,
  filterExpensesByCategory,
  onExpenseCategoryFilterChange,
  onExpenseIncomeTypeChange,
  onExpenseIncomePaymentMethodChange,
  openExpensesWithTab,
  renderExpensesIncomesTable,
  renderSingleExpenseCategoryView,
  confirmPromptModal,
  closePromptModal,
  closeConfirmModal,
  openVoucherModal,
  closeVoucherModal,
  openManualJournalForm,
  closeManualJournalForm,
  toggleAppSidebar,
  fmtMoney,
  toFaDate,
  selectItem,
  editSelectedItemAction,
  deleteItemAction,
  openItemStatementAction,
  openItemStatement,
  closeItemStatement,
  printItemStatement,
  onItemStatementRangeChange,
  resetItemStatementFilters,
  toggleItemStatementValues,
  selectItemStatementRow,
  editSelectedItemStatementDocument,
  viewSelectedItemStatementDocInVouchers,
  viewSelectedItemStatementDoubleEntry,
  renderItemStatementContent
});

