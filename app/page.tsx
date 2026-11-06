"use client";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
type Tx = {id:string;description:string;type:"income"|"expense";amount:number;category:string|null;transaction_date:string};
type Goal = {id:string;name:string;target_amount:number;current_amount:number;target_date:string|null};
type Budget = {id:string;category:string;monthly_limit:number;month:string};
type Debt = {
  id:string;
  creditor:string;
  description:string|null;
  total_amount:number;
  paid_amount:number;
  due_date:string|null;
  installments:number;
};
type DebtPayment = {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
};
const brl=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
export default function Home(){
 const [session,setSession]=useState<Session|null>(null),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[mode,setMode]=useState<"login"|"signup">("login"),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 const [tx,setTx]=useState<Tx[]>([]),[goals,setGoals]=useState<Goal[]>([]),[budgets,setBudgets]=useState<Budget[]>([]),[debts,setDebts]=useState<Debt[]>([]);
 const [debtPayments,setDebtPayments]=useState<DebtPayment[]>([]);
 const [openDebtHistory,setOpenDebtHistory]=useState<string | null>(null); 
  const [desc,setDesc]=useState(""),[amount,setAmount]=useState(""),[kind,setKind]=useState<"income"|"expense">("expense"),[category,setCategory]=useState("Geral"),[goalName,setGoalName]=useState(""),[goalAmount,setGoalAmount]=useState(""),[budgetCategory,setBudgetCategory]=useState("Geral"),[budgetLimit,setBudgetLimit]=useState(""),[budgetMonth,setBudgetMonth]=useState(new Date().toISOString().slice(0,7)),[reportMonth,setReportMonth]=useState(new Date().toISOString().slice(0,7));
 const [editingId,setEditingId]=useState<string|null>(null);
 const [editingGoalId,setEditingGoalId]=useState<string|null>(null);
 const [goalDeposit,setGoalDeposit]=useState("");
  const [debtCreditor,setDebtCreditor]=useState("");
const [debtDescription,setDebtDescription]=useState("");
const [debtTotal,setDebtTotal]=useState("");
const [debtPaid,setDebtPaid]=useState("0");
const [debtDueDate,setDebtDueDate]=useState("");
const [debtInstallments,setDebtInstallments]=useState("1");
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[]);
 useEffect(()=>{if(session?.user)load();else{setTx([]);setGoals([])}},[session?.user?.id]);
 async function load(){
  if(!supabase)return;

  const [a,b,c,d,e]=await Promise.all([
    supabase.from("transactions").select("id,description,type,amount,category,transaction_date").order("transaction_date",{ascending:false}),
    supabase.from("goals").select("id,name,target_amount,current_amount,target_date").order("created_at",{ascending:false}),
    supabase.from("budgets").select("id,category,monthly_limit,month").order("month",{ascending:false}),
    supabase.from("debts").select("id,creditor,description,total_amount,paid_amount,due_date,installments").order("created_at",{ascending:false}),
    supabase.from("debt_payments").select("id,debt_id,amount,payment_date").order("payment_date",{ascending:false})
  ]);
   

  if(a.error)setMsg(a.error.message);else setTx((a.data||[]) as Tx[]);
  if(b.error)setMsg(b.error.message);else setGoals((b.data||[]) as Goal[]);
  if(c.error)setMsg(c.error.message);else setBudgets((c.data||[]) as Budget[]);
  if(d.error)setMsg(d.error.message);else setDebts((d.data||[]) as Debt[]);
  if(e.error)setMsg(e.error.message);
else setDebtPayments((e.data||[]) as DebtPayment[]);
 }
 async function auth(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setMsg("");const r=mode==="signup"?await supabase.auth.signUp({email,password}):await supabase.auth.signInWithPassword({email,password});setBusy(false);if(r.error)setMsg(r.error.message);else if(mode==="signup"&&!r.data.session)setMsg("Cadastro iniciado. Confira seu e-mail para confirmar a conta.");else setMsg("Acesso realizado.")}
 async function addTx(e: FormEvent) {
  e.preventDefault();

  if (!supabase) {
    setMsg("Erro: conexão com o banco de dados não encontrada.");
    return;
  }

  if (!session?.user) {
    setMsg("Sua sessão expirou. Entre novamente na sua conta.");
    return;
  }

  if (!desc.trim()) {
    setMsg("Preencha a descrição do lançamento.");
    return;
  }

  if (!amount || Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
    setMsg("Informe um valor válido, maior que zero.");
    return;
  }

  setBusy(true);
  setMsg("Salvando lançamento...");

  try {
    const { error } = await supabase
      .from("transactions")
      .insert({
        user_id: session.user.id,
        description: desc.trim(),
        type: kind,
        amount: Number(amount),
        category,
        transaction_date: new Date().toISOString().slice(0, 10)
      });

    if (error) {
      setMsg("Erro ao salvar: " + error.message);
      return;
    }

    setDesc("");
    setAmount("");
    setMsg("Lançamento salvo com sucesso!");
    await load();
  } catch (error) {
    setMsg("Falha inesperada ao salvar o lançamento.");
  } finally {
    setBusy(false);
  }
}
function editTx(t: Tx) {
  setEditingId(t.id);
  setDesc(t.description);
  setAmount(String(t.amount));
  setKind(t.type);
  setCategory(t.category || "Geral");
  setMsg("Editando lançamento: " + t.description);
  window.scrollTo({ top: 0, behavior: "smooth" });
}
 async function updateTx(e: FormEvent) {
  e.preventDefault();

  if (!supabase || !session?.user || !editingId) return;

  if (!desc.trim() || Number(amount) <= 0) {
    setMsg("Preencha uma descrição e um valor válido.");
    return;
  }

  setBusy(true);
  setMsg("Atualizando lançamento...");

  try {
    const { error } = await supabase
      .from("transactions")
      .update({
        description: desc.trim(),
        type: kind,
        amount: Number(amount),
        category
      })
      .eq("id", editingId)
      .eq("user_id", session.user.id);

    if (error) {
      setMsg("Erro ao atualizar: " + error.message);
      return;
    }

    setDesc("");
    setAmount("");
    setKind("expense");
    setCategory("Geral");
    setEditingId(null);
    setMsg("Lançamento atualizado com sucesso!");

    await load();
  } finally {
    setBusy(false);
  }
}
 async function removeTx(id: string) {
  if (!supabase || !session?.user) return;

  const confirmar = window.confirm(
    "Tem certeza que deseja excluir este lançamento? Essa ação não poderá ser desfeita."
  );

  if (!confirmar) return;

  setBusy(true);
  setMsg("Excluindo lançamento...");

  try {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", id)
      .eq("user_id", session.user.id);

    if (error) {
      setMsg("Erro ao excluir: " + error.message);
      return;
    }

    setMsg("Lançamento excluído com sucesso!");
    await load();
  } finally {
    setBusy(false);
  }
 }
 async function addGoal(e:FormEvent){e.preventDefault();if(!supabase||!session?.user||!goalName.trim()||Number(goalAmount)<=0)return;setBusy(true);const {error}=await supabase.from("goals").insert({user_id:session.user.id,name:goalName.trim(),target_amount:Number(goalAmount),current_amount:0});setBusy(false);if(error)setMsg(error.message);else{setGoalName("");setGoalAmount("");setMsg("Meta criada.");await load()}}
 async function addBudget(e:FormEvent){
  e.preventDefault();
  if(!supabase||!session?.user||!budgetCategory.trim()||Number(budgetLimit)<=0)return;
  setBusy(true);
  const {error}=await supabase.from("budgets").insert({
    user_id:session.user.id,
    category:budgetCategory.trim(),
    monthly_limit:Number(budgetLimit),
    month:budgetMonth + "-01"
  });
  setBusy(false);
  if(error)setMsg(error.message);
  else{
    setBudgetLimit("");
    setMsg("Orçamento criado com sucesso.");
    await load();
  }
 }
  async function addDebt(e:FormEvent){
  e.preventDefault();

  if(!supabase||!session?.user||!debtCreditor.trim()||Number(debtTotal)<=0)return;

  if(Number(debtPaid)<0||Number(debtPaid)>Number(debtTotal)){
    setMsg("Confira o valor já pago.");
    return;
  }

  setBusy(true);

  const {error}=await supabase.from("debts").insert({
    user_id:session.user.id,
    creditor:debtCreditor.trim(),
    description:debtDescription.trim()||null,
    total_amount:Number(debtTotal),
    paid_amount:Number(debtPaid),
    due_date:debtDueDate||null,
    installments:Math.max(1,Number(debtInstallments)||1)
  });

  setBusy(false);

  if(error)setMsg(error.message);
  else{
    setDebtCreditor("");
    setDebtDescription("");
    setDebtTotal("");
    setDebtPaid("0");
    setDebtDueDate("");
    setDebtInstallments("1");
    setMsg("Dívida cadastrada com sucesso.");
    await load();
  }
  }

  function getDebtPayments(debtId: string) {
  return debtPayments.filter(
    payment => payment.debt_id === debtId
  );
}

async function registerDebtPayment(debt: Debt) {
  if (!supabase || !session?.user) return;

  const remaining =
    Number(debt.total_amount) - Number(debt.paid_amount);

  if (remaining <= 0) {
    setMsg("Esta dívida já está quitada.");
    return;
  }

  const answer = window.prompt(
    `Saldo restante: ${brl(remaining)}\nQuanto deseja pagar?`
  );

  if (answer === null) return;

  const payment = Number(answer.replace(",", "."));

  if (
    !Number.isFinite(payment) ||
    payment <= 0 ||
    payment > remaining
  ) {
    setMsg("Informe um pagamento válido.");
    return;
  }

  setBusy(true);

  const { error } = await supabase.rpc(
    "register_debt_payment",
    {
      p_debt_id: debt.id,
      p_amount: payment
    }
  );

  setBusy(false);

  if (error) {
    setMsg("Erro ao registrar pagamento: " + error.message);
  } else {
    setMsg("Pagamento registrado e salvo no histórico!");
    await load();
  }
}

async function editDebt(debt: Debt) {
  if (!supabase || !session?.user) return;

  const creditor = window.prompt(
    "Nome do credor:",
    debt.creditor
  );

  if (creditor === null) return;

  const description = window.prompt(
    "Descrição da dívida:",
    debt.description || ""
  );

  if (description === null) return;

  const total = window.prompt(
    "Valor total da dívida:",
    String(debt.total_amount)
  );

  if (total === null) return;

  const totalAmount = Number(total.replace(",", "."));

  if (
    !Number.isFinite(totalAmount) ||
    totalAmount <= 0 ||
    totalAmount < Number(debt.paid_amount)
  ) {
    setMsg("O valor total não pode ser menor que o valor já pago.");
    return;
  }

  const dueDate = window.prompt(
    "Vencimento (AAAA-MM-DD):",
    debt.due_date || ""
  );

  if (dueDate === null) return;

  const installments = window.prompt(
    "Quantidade de parcelas:",
    String(debt.installments)
  );

  if (installments === null) return;

  setBusy(true);

  const { error } = await supabase
    .from("debts")
    .update({
      creditor: creditor.trim(),
      description: description.trim() || null,
      total_amount: totalAmount,
      due_date: dueDate || null,
      installments: Math.max(1, Number(installments) || 1)
    })
    .eq("id", debt.id)
    .eq("user_id", session.user.id);

  setBusy(false);

  if (error) {
    setMsg("Erro ao editar dívida: " + error.message);
  } else {
    setMsg("Dívida atualizada com sucesso!");
    await load();
  }
}

async function deleteDebt(debt: Debt) {
  if (!supabase || !session?.user) return;

  const confirmed = window.confirm(
    `Tem certeza que deseja excluir a dívida de ${debt.creditor}? Todos os pagamentos do histórico também serão excluídos.`
  );

  if (!confirmed) return;

  setBusy(true);

  const { error } = await supabase
    .from("debts")
    .delete()
    .eq("id", debt.id)
    .eq("user_id", session.user.id);

  setBusy(false);

  if (error) {
    setMsg("Erro ao excluir dívida: " + error.message);
  } else {
    setMsg("Dívida excluída com sucesso!");
    await load();
  }
}


 function editGoal(g: Goal) {
  setEditingGoalId(g.id);
  setGoalName(g.name);
  setGoalAmount(String(g.target_amount));
  setMsg("Editando meta: " + g.name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function updateGoal(e: FormEvent) {
  e.preventDefault();

  if (!supabase || !session?.user || !editingGoalId) return;

  if (!goalName.trim() || Number(goalAmount) <= 0) {
    setMsg("Informe o nome e um valor válido para a meta.");
    return;
  }

  setBusy(true);
  setMsg("Atualizando meta...");

  try {
    const { error } = await supabase
      .from("goals")
      .update({
        name: goalName.trim(),
        target_amount: Number(goalAmount)
      })
      .eq("id", editingGoalId)
      .eq("user_id", session.user.id);

    if (error) {
      setMsg("Erro ao atualizar meta: " + error.message);
      return;
    }

    setGoalName("");
    setGoalAmount("");
    setEditingGoalId(null);
    setMsg("Meta atualizada com sucesso!");
    await load();
  } finally {
    setBusy(false);
  }
}

async function addGoalDeposit(g: Goal) {
  if (!supabase || !session?.user) return;

  const value = Number(goalDeposit);

  if (!Number.isFinite(value) || value <= 0) {
    setMsg("Informe um valor válido para adicionar.");
    return;
  }

  setBusy(true);
  setMsg("Atualizando valor da meta...");

  try {
    const { error } = await supabase
      .from("goals")
      .update({
        current_amount: Number(g.current_amount) + value
      })
      .eq("id", g.id)
      .eq("user_id", session.user.id);

    if (error) {
      setMsg("Erro ao adicionar valor: " + error.message);
      return;
    }

    setGoalDeposit("");
    setMsg("Valor adicionado à meta com sucesso!");
    await load();
  } finally {
    setBusy(false);
  }
}
 const income=useMemo(()=>tx.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount),0),[tx]),expenses=useMemo(()=>tx.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount),0),[tx]);
 const reportTx=useMemo(
  ()=>tx.filter(x=>x.transaction_date?.slice(0,7)===reportMonth),
  [tx,reportMonth]
);

const reportIncome=useMemo(
  ()=>reportTx.filter(x=>x.type==="income").reduce((s,x)=>s+Number(x.amount),0),
  [reportTx]
);

const reportExpenses=useMemo(
  ()=>reportTx.filter(x=>x.type==="expense").reduce((s,x)=>s+Number(x.amount),0),
  [reportTx]
);

const reportBalance=reportIncome-reportExpenses;
 const monthlyEvolution=useMemo(()=>{
  const [year,month]=reportMonth.split("-").map(Number);

  return Array.from({length:6},(_,i)=>{
    const date=new Date(year,month-1-(5-i),1);
    const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}`;

    const monthTx=tx.filter(t=>
      t.transaction_date?.slice(0,7)===key
    );

    const income=monthTx
      .filter(t=>t.type==="income")
      .reduce((s,t)=>s+Number(t.amount),0);

    const expenses=monthTx
      .filter(t=>t.type==="expense")
      .reduce((s,t)=>s+Number(t.amount),0);

    return {
      month:key,
      label:date.toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}),
      income,
      expenses,
      balance:income-expenses
    };
  });
},[tx,reportMonth]);
  
const totalDebtAmount = debts.reduce(
  (sum, debt) => sum + Number(debt.total_amount),
  0
);

const totalDebtPaid = debts.reduce(
  (sum, debt) => sum + Number(debt.paid_amount),
  0
);

const totalDebtRemaining = debts.reduce(
  (sum, debt) =>
    sum + Math.max(
      0,
      Number(debt.total_amount) - Number(debt.paid_amount)
    ),
  0
);

const totalOpenDebts = debts.filter(
  debt =>
    Number(debt.total_amount) > Number(debt.paid_amount)
).length;

const today = new Date();
today.setHours(0, 0, 0, 0);

const nextSevenDays = new Date(today);
nextSevenDays.setDate(today.getDate() + 7);

const overdueDebts = debts.filter(debt => {
  if (!debt.due_date) return false;

  const remaining =
    Number(debt.total_amount) - Number(debt.paid_amount);

  const dueDate = new Date(debt.due_date + "T00:00:00");

  return remaining > 0 && dueDate < today;
}).length;

const upcomingDebts = debts.filter(debt => {
  if (!debt.due_date) return false;

  const remaining =
    Number(debt.total_amount) - Number(debt.paid_amount);

  const dueDate = new Date(debt.due_date + "T00:00:00");

  return (
    remaining > 0 &&
    dueDate >= today &&
    dueDate <= nextSevenDays
  );
}).length;

 const reportCategoryTotals=useMemo(()=>{
  const totals:Record<string,number>={};

  reportTx
    .filter(x=>x.type==="expense")
    .forEach(x=>{
      const name=x.category||"Geral";
      totals[name]=(totals[name]||0)+Number(x.amount);
    });

  return Object.entries(totals).sort((a,b)=>b[1]-a[1]);
},[reportTx]);
 if(!supabase)return <main className="shell"><section className="panel"><div className="brand">PLANEJAR<span>+</span></div><h1>Configure a conexão</h1><p>Copie .env.example para .env.local e preencha a URL base e a chave publicável do Supabase.</p></section></main>;
 return <main className="shell"><header className="top"><div><div className="brand">PLANEJAR<span>+</span></div><p>Sua vida financeira começa com um plano.</p></div>{session&&<button className="ghost" onClick={()=>supabase?.auth.signOut()}>Sair</button>}</header>
 {msg&&<div className="notice">{msg}</div>}
 {!session?<section className="panel auth"><p className="eyebrow">SEU PLANEJAMENTO COMEÇA AQUI</p><h1>{mode==="login"?"Bem-vindo de volta":"Crie sua conta"}</h1><form className="stack" onSubmit={auth}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label><label>Senha<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label><button className="primary" disabled={busy}>{busy?"Aguarde...":mode==="login"?"Entrar":"Criar conta"}</button></form><button className="textButton" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Ainda não tem conta? Cadastre-se":"Já tem conta? Entrar"}</button><p className="small">Pode ser necessário confirmar seu e-mail antes do primeiro acesso.</p></section>:<>
 <section className="welcome"><p className="eyebrow">VISÃO GERAL</p><h1>Seu dinheiro, com direção.</h1><p>Organize. Planeje. Conquiste.</p></section>
 <section className="stats"><article className="stat"><span>Saldo dos lançamentos</span><strong>{brl(income-expenses)}</strong></article><article className="stat"><span>Receitas</span><strong className="positive">{brl(income)}</strong></article><article className="stat"><span>Despesas</span><strong className="negative">{brl(expenses)}</strong></article></section>
  <section className="panel">
  <p className="eyebrow">ANÁLISE FINANCEIRA</p>
  <h2>Relatórios mensais</h2>

  <label>
    Selecione o mês
    <input
      type="month"
      value={reportMonth}
      onChange={e => setReportMonth(e.target.value)}
    />
  </label>

  <section className="stats">
    <article className="stat">
      <span>Saldo do mês</span>
      <strong>{brl(reportBalance)}</strong>
    </article>

    <article className="stat">
      <span>Receitas do mês</span>
      <strong className="positive">{brl(reportIncome)}</strong>
    </article>

    <article className="stat">
      <span>Despesas do mês</span>
      <strong className="negative">{brl(reportExpenses)}</strong>
    </article>
  </section>
   <div className="categoryReport">
  <h3>Despesas por categoria</h3>

  {reportCategoryTotals.length===0 ? (
    <p className="muted">Nenhuma despesa registrada neste mês.</p>
  ) : (
    <div className="list">
      {reportCategoryTotals.map(([name,value])=>{
        const maxValue=Math.max(
          ...reportCategoryTotals.map(item=>item[1]),
          1
        );

        return (
          <div className="goal" key={name}>
            <div className="sectionHead">
              <strong>{name}</strong>
              <strong>{brl(value)}</strong>
            </div>

            <div className="bar">
              <span style={{
                width:`${value/maxValue*100}%`
              }}/>
            </div>
          </div>
        );
      })}
    </div>
   )}
</div>


<div className="categoryReport evolutionPanel">
  <details className="evolutionDetails">
    <summary>
      <div>
        <strong>Evolução financeira</strong>
        <p className="muted">
          Acompanhe seus últimos 6 meses
        </p>
      </div>
      <span className="evolutionArrow">⌄</span>
    </summary>

    <div className="evolutionMonths">
      <h3>Últimos 6 meses</h3>

      {monthlyEvolution.map(m => {
        const maxValue = Math.max(
          ...monthlyEvolution.map(item =>
            Math.max(item.income, item.expenses)
          ),
          1
        );

        return (
          <div className="goal" key={m.month}>
            <div className="sectionHead">
              <strong>{m.label}</strong>
              <strong>Saldo: {brl(m.balance)}</strong>
            </div>

            <p>Receitas: {brl(m.income)}</p>
            <div className="bar">
              <span style={{
                width: `${m.income / maxValue * 100}%`,
                background: "#22c55e"
              }} />
            </div>

            <p>Despesas: {brl(m.expenses)}</p>
            <div className="bar">
              <span style={{
                width: `${m.expenses / maxValue * 100}%`,
                background: "#ef4444"
              }} />
            </div>
          </div>
        );
      })}
    </div>
  </details>
</div>

</section> 
  <section className="grid">
  <article className="panel">
    <p className="eyebrow">NOVO LANÇAMENTO</p>
    <h2>Registrar movimentação</h2>

    <form className="stack" onSubmit={editingId ? updateTx : addTx}>
      <label>
        Descrição
        <input
          required
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="Ex.: Mercado"
        />
      </label>

      <div className="two">
        <label>
          Tipo
          <select
            value={kind}
            onChange={e => setKind(e.target.value as "income" | "expense")}
          >
            <option value="expense">Despesa</option>
            <option value="income">Receita</option>
          </select>
        </label>

        <label>
          Valor (R$)
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </label>
      </div>

      <label>
        Categoria
        <input
          value={category}
          onChange={e => setCategory(e.target.value)}
        />
      </label>

      <button className="primary" disabled={busy}>
        {busy
          ? "Aguarde..."
          : editingId
            ? "Salvar alterações"
            : "Salvar lançamento"}
      </button>

      {editingId && (
        <button
          type="button"
          className="ghost"
          onClick={() => {
            setEditingId(null);
            setDesc("");
            setAmount("");
            setKind("expense");
            setCategory("Geral");
            setMsg("");
          }}
        >
          Cancelar edição
        </button>
      )}
    </form>
  </article>
 <article className="panel">
  <p className="eyebrow">METAS E SONHOS</p>
  <h2>{editingGoalId ? "Editar meta" : "Nova meta"}</h2>

  <form
    className="stack"
    onSubmit={editingGoalId ? updateGoal : addGoal}
  >
    <label>
      Nome
      <input
        required
        value={goalName}
        onChange={e => setGoalName(e.target.value)}
        placeholder="Ex.: Reserva de emergência"
      />
    </label>

    <label>
      Valor desejado (R$)
      <input
        type="number"
        min="0.01"
        step="0.01"
        required
        value={goalAmount}
        onChange={e => setGoalAmount(e.target.value)}
      />
    </label>

    <button className="secondary" disabled={busy}>
      {editingGoalId ? "Salvar alterações" : "Criar meta"}
    </button>

    {editingGoalId && (
      <button
        type="button"
        className="ghost"
        onClick={() => {
          setEditingGoalId(null);
          setGoalName("");
          setGoalAmount("");
          setMsg("Edição cancelada.");
        }}
      >
        Cancelar edição
      </button>
    )}
  </form>
    </article>
</section>
   <section className="panel">
  <p className="eyebrow">CONTROLE FINANCEIRO</p>
  <h2>Controle de dívidas</h2>
  <p className="muted">
    Cadastre suas dívidas e acompanhe o que ainda falta pagar.
  </p>

  <form className="stack" onSubmit={addDebt}>
    <label>
      Credor ou empresa
      <input
        required
        value={debtCreditor}
        onChange={e => setDebtCreditor(e.target.value)}
        placeholder="Ex.: Banco, loja ou pessoa"
      />
    </label>

    <label>
      Descrição da dívida
      <input
        value={debtDescription}
        onChange={e => setDebtDescription(e.target.value)}
        placeholder="Ex.: Empréstimo pessoal"
      />
    </label>

    <div className="two">
      <label>
        Valor total (R$)
        <input
          type="number"
          min="0.01"
          step="0.01"
          required
          value={debtTotal}
          onChange={e => setDebtTotal(e.target.value)}
        />
      </label>

      <label>
        Valor já pago (R$)
        <input
          type="number"
          min="0"
          step="0.01"
          value={debtPaid}
          onChange={e => setDebtPaid(e.target.value)}
        />
      </label>
    </div>

    <div className="two">
      <label>
        Vencimento
        <input
          type="date"
          value={debtDueDate}
          onChange={e => setDebtDueDate(e.target.value)}
        />
      </label>

      <label>
        Quantidade de parcelas
        <input
          type="number"
          min="1"
          step="1"
          value={debtInstallments}
          onChange={e => setDebtInstallments(e.target.value)}
        />
      </label>
    </div>

    <button className="primary" disabled={busy}>
      {busy ? "Aguarde..." : "Cadastrar dívida"}
    </button>
    </form>

  <div className="categoryReport">
    
  <h3>Resumo das dívidas</h3>

  <div className="list">
    <div className="goal">
      <div className="sectionHead">
        <span>Total de dívidas cadastradas</span>
        <strong>{debts.length}</strong>
      </div>
      <p>Em aberto: {totalOpenDebts}</p>
    </div>

    <div className="goal">
      <div className="sectionHead">
        <span>Valor total das dívidas</span>
        <strong>{brl(totalDebtAmount)}</strong>
      </div>
    </div>

    <div className="goal">
      <div className="sectionHead">
        <span>Total já pago</span>
        <strong>{brl(totalDebtPaid)}</strong>
      </div>
    </div>

    <div className="goal">
      <div className="sectionHead">
        <span>Saldo restante</span>
        <strong>{brl(totalDebtRemaining)}</strong>
      </div>
    </div>

    <div className="goal">
      <div className="sectionHead">
        <span>Dívidas atrasadas</span>
        <strong>{overdueDebts}</strong>
      </div>
    </div>

    <div className="goal">
      <div className="sectionHead">
        <span>Vencem nos próximos 7 dias</span>
        <strong>{upcomingDebts}</strong>
      </div>
    </div>
  </div>

    <h3>Minhas dívidas</h3>

    {debts.length === 0 ? (
      <p className="muted">Nenhuma dívida cadastrada.</p>
    ) : (
      <div className="list">
        {debts.map(d => {
          const remaining = Number(d.total_amount) - Number(d.paid_amount);
          const progress = Math.min(
            100,
            Math.max(0, Number(d.paid_amount) / Number(d.total_amount) * 100)
          );

          return (
            <div className="goal" key={d.id}>
              <div className="sectionHead">
                <strong>{d.creditor}</strong>
                <strong>{brl(remaining)}</strong>
              </div>

              <p>{d.description || "Dívida cadastrada"}</p>
              <p>Valor total: {brl(Number(d.total_amount))}</p>
              <p>Já pago: {brl(Number(d.paid_amount))}</p>
              <p>
                Situação: {remaining <= 0
                  ? "Quitada"
                  : Number(d.paid_amount) > 0
                    ? "Parcialmente paga"
                    : "Em aberto"}
              </p>

              <div className="bar">
                <span style={{width: `${progress}%`}} />
              </div>

              <p>{progress.toFixed(0)}% pago</p>

                            <p>
                Parcelas: {d.installments}
              </p>

              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setOpenDebtHistory(
                    openDebtHistory === d.id ? null : d.id
                  )
                }
              >
                {openDebtHistory === d.id
                  ? "Fechar histórico"
                  : "Ver histórico"}
              </button>

              <button
                type="button"
                className="secondary"
                disabled={busy || remaining <= 0}
                onClick={() => registerDebtPayment(d)}
              >
                Registrar pagamento
              </button>
              <div className="two">
  <button
    type="button"
    className="secondary"
    disabled={busy}
    onClick={() => editDebt(d)}
  >
    Editar dívida
  </button>

  <button
    type="button"
    className="secondary"
    disabled={busy}
    onClick={() => deleteDebt(d)}
  >
    Excluir dívida
  </button>
</div>
                            {openDebtHistory === d.id && (
                <div className="categoryReport">
                  <h3>Histórico de pagamentos</h3>

                  {getDebtPayments(d.id).length === 0 ? (
                    <p className="muted">
                      Nenhum pagamento registrado.
                    </p>
                  ) : (
                    <div className="list">
                      {getDebtPayments(d.id).map(payment => (
                        <div className="sectionHead" key={payment.id}>
                          <span>
                            {new Date(
                              payment.payment_date + "T00:00:00"
                            ).toLocaleDateString("pt-BR")}
                          </span>

                          <strong>
                            {brl(Number(payment.amount))}
                          </strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
</section>
  <section className="panel">
  <p className="eyebrow">CONTROLE FINANCEIRO</p>
  <h2>Orçamento mensal</h2>
  <p className="muted">Defina quanto pretende gastar em cada categoria.</p>

  <form className="stack" onSubmit={addBudget}>
    <label>
      Categoria
      <select
        value={budgetCategory}
        onChange={e => setBudgetCategory(e.target.value)}
      >
        <option>Geral</option>
        <option>Alimentação</option>
        <option>Moradia</option>
        <option>Transporte</option>
        <option>Saúde</option>
        <option>Educação</option>
        <option>Lazer</option>
        <option>Contas</option>
        <option>Outros</option>
      </select>
    </label>

    <label>
      Limite mensal (R$)
      <input
        type="number"
        min="0.01"
        step="0.01"
        required
        value={budgetLimit}
        onChange={e => setBudgetLimit(e.target.value)}
        placeholder="Ex.: 500"
      />
    </label>

    <label>
      Mês de referência
      <input
        type="month"
        required
        value={budgetMonth}
        onChange={e => setBudgetMonth(e.target.value)}
      />
    </label>

    <button className="secondary" disabled={busy}>
      Criar orçamento
    </button>
  </form>
</section>
   <section className="panel">
  <div className="sectionHead">
    <div>
      <p className="eyebrow">ACOMPANHAMENTO</p>
      <h2>Últimos lançamentos</h2>
    </div>
    <button type="button" className="ghost" onClick={load}>
      Atualizar
    </button>
  </div>

  {tx.length === 0 ? (
    <p className="muted">Ainda não há lançamentos.</p>
  ) : (
    <div className="list">
      {tx.map(x => (
        <div className="listRow" key={x.id}>
          <div>
            <strong>{x.description}</strong>
            <p>
              {x.category || "Sem categoria"} ·{" "}
              {new Date(x.transaction_date + "T12:00:00").toLocaleDateString("pt-BR")}
            </p>
          </div>

          <strong className={x.type === "income" ? "positive" : "negative"}>
            {x.type === "income" ? "+" : "−"} {brl(Number(x.amount))}
          </strong>

          <button
            type="button"
            className="ghost"
            onClick={() => editTx(x)}
          >
            Editar
          </button>

          <button
            type="button"
            className="delete"
            onClick={() => removeTx(x.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
     )}
  </section>
  
 <section className="panel">
  <p className="eyebrow">SEUS OBJETIVOS</p>
  <h2>Metas cadastradas</h2>

  {goals.length === 0 ? (
    <p className="muted">Suas metas aparecerão aqui.</p>
  ) : (
    <div className="list">
      {goals.map(g => (
        <div className="goal" key={g.id}>
          <div className="sectionHead">
            <strong>{g.name}</strong>
            <span>
              {brl(Number(g.current_amount))} / {brl(Number(g.target_amount))}
            </span>
          </div>

          <div className="bar">
            <span
              style={{
                width: `${Math.min(
                  100,
                  Number(g.target_amount)
                    ? Number(g.current_amount) / Number(g.target_amount) * 100
                    : 0
                )}%`
              }}
            />
          </div>

          <p className="muted">
            {Math.min(
              100,
              Number(g.target_amount)
                ? Number(g.current_amount) / Number(g.target_amount) * 100
                : 0
            ).toFixed(1)}% concluído
          </p>

          <p>
            Faltam: {brl(Math.max(0, Number(g.target_amount) - Number(g.current_amount)))}
          </p>

          <form
            className="stack"
            onSubmit={e => {
              e.preventDefault();
              addGoalDeposit(g);
            }}
          >
            <label>
              Valor a adicionar (R$)
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={goalDeposit}
                onChange={e => setGoalDeposit(e.target.value)}
                placeholder="Ex.: 100,00"
              />
            </label>

            <button type="submit" className="secondary" disabled={busy}>
              Adicionar valor
            </button>
          </form>

          <button
            type="button"
            className="ghost"
            onClick={() => editGoal(g)}
          >
            Editar meta
          </button>
        </div>
      ))}
    </div>
  )}
</section>
  <section className="panel">
  <p className="eyebrow">ACOMPANHAMENTO</p>
  <h2>Seus orçamentos</h2>

  {budgets.length === 0 ? (
    <p className="muted">Seus orçamentos aparecerão aqui.</p>
  ) : (
    <div className="list">
      {budgets.map(b => {
        const spent = tx
          .filter(t =>
            t.type === "expense" &&
            t.category === b.category &&
            t.transaction_date?.slice(0, 7) === b.month?.slice(0, 7)
          )
          .reduce((total, t) => total + Number(t.amount), 0);

        const limit = Number(b.monthly_limit);
        const percent = limit > 0 ? spent / limit * 100 : 0;

        return (
          <div className="goal" key={b.id}>
            <div className="sectionHead">
              <strong>{b.category}</strong>
              <span>{b.month}</span>
            </div>

            <p>
              Gasto: {brl(spent)} / {brl(limit)}
            </p>

            <div className="bar">
              <span
                style={{
                  width: `${Math.min(100, percent)}%`
                }}
              />
            </div>

            <p className="muted">
              {percent.toFixed(1)}% do orçamento utilizado
            </p>

            <p>
              {spent > limit
                ? `Você ultrapassou o limite em ${brl(spent - limit)}.`
                : `Disponível: ${brl(limit - spent)}`}
            </p>
          </div>
        );
      })}
    </div>
  )}
</section>
  <section className="panel">
  <p className="eyebrow">INTELIGÊNCIA FINANCEIRA</p>
  <h2>Planejado x Realizado</h2>

  <p className="muted">
    Comparação dos limites definidos com os gastos reais do mês selecionado.
  </p>

  {budgets.filter(b => b.month?.slice(0,7) === reportMonth).length === 0 ? (
    <p className="muted">
      Nenhum orçamento cadastrado para este mês.
    </p>
  ) : (
    <div className="list">
      {budgets
        .filter(b => b.month?.slice(0,7) === reportMonth)
        .map(b => {
          const spent = reportTx
            .filter(t =>
              t.type === "expense" &&
              t.category === b.category
            )
            .reduce((total,t) => total + Number(t.amount),0);

          const limit = Number(b.monthly_limit);
          const percent = limit > 0 ? spent / limit * 100 : 0;

          return (
            <div className="goal" key={b.id}>
              <div className="sectionHead">
                <strong>{b.category}</strong>
                <strong>{percent.toFixed(1)}%</strong>
              </div>

              <p>Planejado: {brl(limit)}</p>
              <p>Realizado: {brl(spent)}</p>

              <div className="bar">
                <span style={{
                  width:`${Math.min(100,percent)}%`
                }}/>
              </div>

              <p className="muted">
                {spent > limit
                  ? `Acima do limite: ${brl(spent-limit)}`
                  : `Ainda disponível: ${brl(limit-spent)}`}
              </p>
            </div>
          );
        })}
    </div>
  )}
</section>
 </>}<footer>PLANEJAR+ · Organize. Planeje. Conquiste.</footer></main>
}
