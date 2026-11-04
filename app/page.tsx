"use client";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
type Tx = {id:string;description:string;type:"income"|"expense";amount:number;category:string|null;transaction_date:string};
type Goal = {id:string;name:string;target_amount:number;current_amount:number;target_date:string|null};
type Budget = {id:string;category:string;monthly_limit:number;month:string};
const brl=(v:number)=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
export default function Home(){
 const [session,setSession]=useState<Session|null>(null),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[mode,setMode]=useState<"login"|"signup">("login"),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 const [tx,setTx]=useState<Tx[]>([]),[goals,setGoals]=useState<Goal[]>([]),[budgets,setBudgets]=useState<Budget[]>([]);
 const [desc,setDesc]=useState(""),[amount,setAmount]=useState(""),[kind,setKind]=useState<"income"|"expense">("expense"),[category,setCategory]=useState("Geral"),[goalName,setGoalName]=useState(""),[goalAmount,setGoalAmount]=useState(""),[budgetCategory,setBudgetCategory]=useState("Geral"),[budgetLimit,setBudgetLimit]=useState(""),[budgetMonth,setBudgetMonth]=useState(new Date().toISOString().slice(0,7));
 const [editingId,setEditingId]=useState<string|null>(null);
 const [editingGoalId,setEditingGoalId]=useState<string|null>(null);
 const [goalDeposit,setGoalDeposit]=useState("");
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>setSession(data.session));const {data}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));return()=>data.subscription.unsubscribe()},[]);
 useEffect(()=>{if(session?.user)load();else{setTx([]);setGoals([])}},[session?.user?.id]);
 async function load(){
  if(!supabase)return;
  const [a,b,c]=await Promise.all([
    supabase.from("transactions").select("id,description,type,amount,category,transaction_date").order("transaction_date",{ascending:false}),
    supabase.from("goals").select("id,name,target_amount,current_amount,target_date").order("created_at",{ascending:false}),
    supabase.from("budgets").select("id,category,monthly_limit,month").order("month",{ascending:false})
  ]);
  if(a.error)setMsg(a.error.message);else setTx((a.data||[]) as Tx[]);
  if(b.error)setMsg(b.error.message);else setGoals((b.data||[]) as Goal[]);
  if(c.error)setMsg(c.error.message);else setBudgets((c.data||[]) as Budget[]);
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
    month:budgetMonth
  });
  setBusy(false);
  if(error)setMsg(error.message);
  else{
    setBudgetLimit("");
    setMsg("Orçamento criado com sucesso.");
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
 if(!supabase)return <main className="shell"><section className="panel"><div className="brand">PLANEJAR<span>+</span></div><h1>Configure a conexão</h1><p>Copie .env.example para .env.local e preencha a URL base e a chave publicável do Supabase.</p></section></main>;
 return <main className="shell"><header className="top"><div><div className="brand">PLANEJAR<span>+</span></div><p>Sua vida financeira começa com um plano.</p></div>{session&&<button className="ghost" onClick={()=>supabase?.auth.signOut()}>Sair</button>}</header>
 {msg&&<div className="notice">{msg}</div>}
 {!session?<section className="panel auth"><p className="eyebrow">SEU PLANEJAMENTO COMEÇA AQUI</p><h1>{mode==="login"?"Bem-vindo de volta":"Crie sua conta"}</h1><form className="stack" onSubmit={auth}><label>E-mail<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com"/></label><label>Senha<input type="password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres"/></label><button className="primary" disabled={busy}>{busy?"Aguarde...":mode==="login"?"Entrar":"Criar conta"}</button></form><button className="textButton" onClick={()=>setMode(mode==="login"?"signup":"login")}>{mode==="login"?"Ainda não tem conta? Cadastre-se":"Já tem conta? Entrar"}</button><p className="small">Pode ser necessário confirmar seu e-mail antes do primeiro acesso.</p></section>:<>
 <section className="welcome"><p className="eyebrow">VISÃO GERAL</p><h1>Seu dinheiro, com direção.</h1><p>Organize. Planeje. Conquiste.</p></section>
 <section className="stats"><article className="stat"><span>Saldo dos lançamentos</span><strong>{brl(income-expenses)}</strong></article><article className="stat"><span>Receitas</span><strong className="positive">{brl(income)}</strong></article><article className="stat"><span>Despesas</span><strong className="negative">{brl(expenses)}</strong></article></section>
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
</article>
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
            t.transaction_date?.slice(0, 7) === b.month
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
 </>}<footer>PLANEJAR+ · Organize. Planeje. Conquiste.</footer></main>
}
