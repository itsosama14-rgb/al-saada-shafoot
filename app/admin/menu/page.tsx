"use client";
import { useCallback, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Image as ImageIcon, Eye, EyeOff, Utensils, Tags, RefreshCw, LogOut } from "lucide-react";

type Item={id:number;name:string;description:string;price:number;image:string;category:string;tag?:string;available:boolean};
type Draft={name:string;description:string;price:string;image:string;category:string;tag:string;available:boolean};
const blank:Draft={name:"",description:"",price:"",image:"",category:"الشاورما",tag:"",available:true};
const css:Record<string,React.CSSProperties>={
 page:{minHeight:"100vh",background:"#f8f7f2",direction:"rtl",fontFamily:"Cairo,Arial,sans-serif",color:"#203328",padding:"28px 16px"},
 wrap:{maxWidth:1100,margin:"0 auto"},
 panel:{background:"#fff",border:"1px solid #e9e5dc",borderRadius:16,padding:20},
 input:{width:"100%",padding:"11px 12px",border:"1px solid #dedfd8",borderRadius:9,background:"#fff",font:"inherit",fontSize:13,boxSizing:"border-box"},
 label:{display:"block",fontSize:12,fontWeight:800,marginBottom:6,color:"#526255"},
 primary:{border:0,borderRadius:9,background:"#214b35",color:"#fff",padding:"11px 16px",fontWeight:800,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:7},
 subtle:{border:"1px solid #e5e7df",borderRadius:9,background:"#f7f8f4",color:"#34533b",padding:"9px 12px",fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6},
 danger:{border:"1px solid #f1d8d4",borderRadius:9,background:"#fff7f6",color:"#a33b32",padding:"9px 12px",fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:6}
};
export default function MenuAdminPage(){
 const [password,setPassword]=useState("");
 const [logged,setLogged]=useState(false);
 const [items,setItems]=useState<Item[]>([]);
 const [categories,setCategories]=useState<string[]>([]);
 const [draft,setDraft]=useState<Draft>(blank);
 const [editing,setEditing]=useState<number|null>(null);
 const [newCategory,setNewCategory]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [showUnavailable,setShowUnavailable]=useState(true);

 const request=useCallback(async(path:string,method="GET",body?:unknown)=>{
   const response=await fetch(path,{method,headers:{"Content-Type":"application/json","x-admin-password":password},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"تعذر تنفيذ العملية");
   return data;
 },[password]);
 const load=useCallback(async()=>{
   setBusy(true);setError("");
   try{const data=await request("/api/admin/menu");setItems(data.items||[]);setCategories(data.categories||[]);setLogged(true);}
   catch(e){setLogged(false);setError(e instanceof Error?e.message:"تعذر تحميل المنيو");}
   finally{setBusy(false);}
 },[request]);
 function edit(item:Item){setEditing(item.id);setDraft({name:item.name,description:item.description,price:String(item.price),image:item.image,category:item.category,tag:item.tag||"",available:item.available!==false});setMessage("");setError("");}
 function reset(){setEditing(null);setDraft({...blank,category:categories[0]||"الشاورما"});}
 async function save(e:React.FormEvent){
   e.preventDefault();setBusy(true);setError("");setMessage("");
   try{
     const body={...draft,price:Number(draft.price)};
     const data=await request("/api/admin/menu",editing===null?"POST":"PUT",editing===null?body:{...body,id:editing});
     setItems(data.items||[data.item,...items]);setMessage(editing===null?"تمت إضافة الصنف وحفظه في قاعدة البيانات.":"تم حفظ تعديلات الصنف.");
     reset();
   }catch(e){setError(e instanceof Error?e.message:"تعذر حفظ الصنف");}
   finally{setBusy(false);}
 }
 async function remove(id:number){
   if(!window.confirm("هل أنت متأكد من حذف هذا الصنف نهائياً؟"))return;
   setBusy(true);setError("");setMessage("");
   try{const data=await request("/api/admin/menu","DELETE",{id});setItems(data.items||[]);if(editing===id)reset();setMessage("تم حذف الصنف.");}
   catch(e){setError(e instanceof Error?e.message:"تعذر الحذف");}
   finally{setBusy(false);}
 }
 async function addCategory(e:React.FormEvent){
   e.preventDefault();setBusy(true);setError("");setMessage("");
   try{const data=await request("/api/admin/menu","POST",{action:"add-category",category:newCategory});setCategories(data.categories||[]);setNewCategory("");setMessage("تمت إضافة القسم.");}
   catch(e){setError(e instanceof Error?e.message:"تعذر إضافة القسم");}
   finally{setBusy(false);}
 }
 async function renameCategory(category:string){
   const next=window.prompt("اكتب الاسم الجديد للقسم:",category)?.trim();
   if(!next||next===category)return;
   setBusy(true);setError("");setMessage("");
   try{const data=await request("/api/admin/menu","PUT",{action:"rename-category",oldCategory:category,newCategory:next});setCategories(data.categories||[]);setItems(data.items||[]);if(draft.category===category)setDraft(old=>({...old,category:next}));setMessage("تم تغيير اسم القسم وتحديث أصنافه.");}
   catch(e){setError(e instanceof Error?e.message:"تعذر تعديل القسم");}
   finally{setBusy(false);}
 }
 async function deleteCategory(category:string){
   if(!window.confirm("حذف القسم "+category+"؟"))return;
   setBusy(true);setError("");setMessage("");
   try{const data=await request("/api/admin/menu","DELETE",{action:"delete-category",category});setCategories(data.categories||[]);setMessage("تم حذف القسم.");}
   catch(e){setError(e instanceof Error?e.message:"تعذر حذف القسم");}
   finally{setBusy(false);}
 }
 const visible=items.filter(x=>showUnavailable||x.available!==false);
 return <main style={css.page}><div style={css.wrap}>
   <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:24}}>
     <div><a href="/" style={{color:"#a8753d",textDecoration:"none",fontSize:12,fontWeight:800}}>← العودة إلى الموقع</a><h1 style={{fontSize:28,margin:"9px 0 3px"}}>إدارة منيو مطعم السعادة</h1><p style={{margin:0,color:"#7d877d",fontSize:13}}>أضف الأصناف وعدّل الأسعار والصور والأقسام، وستظهر التغييرات للزوار مباشرة.</p></div>
     {logged&&<button style={css.subtle} onClick={()=>{setLogged(false);setPassword("");}}><LogOut size={16}/> تسجيل الخروج</button>}
   </header>
   {!logged?<form onSubmit={e=>{e.preventDefault();load();}} style={{...css.panel,maxWidth:430,margin:"40px auto"}}>
     <div style={{width:48,height:48,borderRadius:14,background:"#eaf0e8",color:"#214b35",display:"grid",placeItems:"center"}}><Utensils/></div>
     <h2 style={{fontSize:20,margin:"14px 0 6px"}}>دخول الإدارة</h2><p style={{fontSize:12,color:"#7d877d",marginTop:0}}>أدخل كلمة مرور الإدارة لإدارة قائمة الطعام.</p>
     <label style={css.label}>كلمة مرور الإدارة</label><input style={css.input} type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/>
     <button style={{...css.primary,marginTop:14,width:"100%",justifyContent:"center"}} disabled={busy}>{busy?"جارٍ التحقق...":"دخول لوحة الإدارة"}</button>
   </form>:<>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:18}}>
      <div style={css.panel}><span style={{fontSize:12,color:"#7d877d"}}>إجمالي الأصناف</span><div style={{fontSize:27,fontWeight:900}}>{items.length}</div></div>
      <div style={css.panel}><span style={{fontSize:12,color:"#7d877d"}}>متاحة للطلب</span><div style={{fontSize:27,fontWeight:900,color:"#287044"}}>{items.filter(x=>x.available!==false).length}</div></div>
      <div style={css.panel}><span style={{fontSize:12,color:"#7d877d"}}>الأقسام</span><div style={{fontSize:27,fontWeight:900}}>{categories.length}</div></div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"minmax(0,1.15fr) minmax(280px,.85fr)",gap:16,alignItems:"start"}}>
      <section style={css.panel}>
       <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:16}}>
        <h2 style={{fontSize:18,margin:0}}>أصناف المنيو</h2>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
         <button style={css.subtle} onClick={()=>setShowUnavailable(v=>!v)}>{showUnavailable?<Eye size={15}/>:<EyeOff size={15}/>} {showUnavailable?"عرض الكل":"المتاح فقط"}</button>
         <button style={css.subtle} onClick={load} disabled={busy}><RefreshCw size={15}/> تحديث</button>
         <button style={css.primary} onClick={reset}><Plus size={16}/> صنف جديد</button>
        </div>
       </div>
       <div style={{display:"grid",gap:10}}>
        {visible.map(item=><article key={item.id} style={{display:"grid",gridTemplateColumns:"76px minmax(0,1fr) auto",gap:12,alignItems:"center",border:"1px solid #eeeae2",borderRadius:12,padding:10,opacity:item.available===false?.58:1}}>
          <img src={item.image} alt={item.name} style={{width:76,height:70,objectFit:"cover",borderRadius:9,background:"#eee"}}/>
          <div style={{minWidth:0}}><b style={{display:"block",fontSize:14}}>{item.name}</b><span style={{fontSize:11,color:"#7d877d"}}>{item.category} · {item.price} ₪</span><div style={{fontSize:11,color:item.available===false?"#a33b32":"#287044",marginTop:4}}>{item.available===false?"غير متوفر حالياً":"متاح للطلب"} {item.tag?"· "+item.tag:""}</div></div>
          <div style={{display:"flex",gap:6,flexDirection:"column"}}><button style={css.subtle} onClick={()=>edit(item)}><Pencil size={14}/> تعديل</button><button style={css.danger} onClick={()=>remove(item.id)} disabled={busy}><Trash2 size={14}/> حذف</button></div>
        </article>)}
        {!visible.length&&<p style={{textAlign:"center",color:"#879087",padding:25}}>لا توجد أصناف هنا بعد.</p>}
       </div>
      </section>
      <div style={{display:"grid",gap:16}}>
       <section style={css.panel}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h2 style={{fontSize:18,margin:0}}>{editing===null?"إضافة صنف جديد":"تعديل الصنف"}</h2>{editing!==null&&<button style={css.subtle} onClick={reset}><X size={15}/> إلغاء</button>}</div>
        <form onSubmit={save}>
         <label style={css.label}>اسم الصنف *</label><input style={css.input} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} required maxLength={100} placeholder="مثال: وجبة شاورما عربي"/>
         <label style={{...css.label,marginTop:12}}>الوصف</label><textarea style={{...css.input,minHeight:72,resize:"vertical"}} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} maxLength={300} placeholder="مكونات الوجبة ووصف مختصر"/>
         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:12}}>
          <div><label style={css.label}>السعر (₪) *</label><input style={css.input} type="number" min="0" step="0.01" value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} required/></div>
          <div><label style={css.label}>القسم *</label><input style={css.input} list="menu-categories" value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})} required/><datalist id="menu-categories">{categories.map(c=><option key={c} value={c}/>)}</datalist></div>
         </div>
         <label style={{...css.label,marginTop:12}}>رابط صورة الصنف *</label><input style={css.input} type="url" value={draft.image} onChange={e=>setDraft({...draft,image:e.target.value})} required placeholder="https://..."/>
         {draft.image&&<div style={{display:"flex",alignItems:"center",gap:10,marginTop:8}}><img src={draft.image} alt="معاينة الصورة" onError={e=>{e.currentTarget.style.display="none";}} style={{width:64,height:56,objectFit:"cover",borderRadius:8}}/><span style={{fontSize:11,color:"#7d877d"}}><ImageIcon size={14} style={{verticalAlign:"middle"}}/> معاينة الصورة</span></div>}
         <label style={{...css.label,marginTop:12}}>شارة اختيارية</label><input style={css.input} value={draft.tag} onChange={e=>setDraft({...draft,tag:e.target.value})} placeholder="الأكثر طلباً / جديد / عرض خاص"/>
         <label style={{display:"flex",alignItems:"center",gap:9,fontSize:12,fontWeight:700,marginTop:14}}><input type="checkbox" checked={draft.available} onChange={e=>setDraft({...draft,available:e.target.checked})}/> الصنف متاح للطلب</label>
         <button style={{...css.primary,width:"100%",justifyContent:"center",marginTop:16}} disabled={busy}><Save size={16}/>{busy?"جارٍ الحفظ...":editing===null?"حفظ وإضافة الصنف":"حفظ التعديلات"}</button>
        </form>
       </section>
       <section style={css.panel}>
        <h2 style={{fontSize:18,margin:"0 0 12px"}}><Tags size={17} style={{verticalAlign:"middle"}}/> إدارة الأقسام</h2>
        <form onSubmit={addCategory} style={{display:"flex",gap:8}}><input style={{...css.input,flex:1,minWidth:0}} value={newCategory} onChange={e=>setNewCategory(e.target.value)} placeholder="اسم القسم الجديد" required maxLength={60}/><button style={css.primary} disabled={busy}><Plus size={15}/> إضافة</button></form>
        <div style={{display:"flex",flexWrap:"wrap",gap:7,marginTop:13}}>{categories.map(c=><span key={c} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"7px 9px",background:"#f2f5ef",borderRadius:8,fontSize:12}}>{c}<button title="تعديل اسم القسم" onClick={()=>renameCategory(c)} style={{border:0,background:"transparent",color:"#34533b",cursor:"pointer",padding:0,display:"grid"}}><Pencil size={13}/></button><button title="حذف القسم" onClick={()=>deleteCategory(c)} style={{border:0,background:"transparent",color:"#a33b32",cursor:"pointer",padding:0,display:"grid"}}><X size={14}/></button></span>)}</div>
        <p style={{fontSize:10,color:"#8b9188",lineHeight:1.8,marginBottom:0}}>لا يمكن حذف قسم ما دام يحتوي على أصناف. غيّر أقسام هذه الأصناف أولاً.</p>
       </section>
      </div>
    </div>
   </>}
   {error&&<p role="alert" style={{background:"#fff1ef",color:"#a33b32",padding:12,borderRadius:9,fontSize:13,marginTop:16}}>{error}</p>}
   {message&&<p role="status" style={{background:"#edf5ed",color:"#28603b",padding:12,borderRadius:9,fontSize:13,marginTop:16}}>{message}</p>}
   <footer style={{textAlign:"center",color:"#92988e",fontSize:11,padding:25}}>مطعم السعادة · إدارة قائمة الطعام</footer>
 </div>
 <style jsx global>{`@media(max-width:760px){main>div>div[style*="1.15fr"]{grid-template-columns:1fr!important}}button:disabled{opacity:.55;cursor:not-allowed}input:focus,textarea:focus{outline:2px solid #a6bea8;outline-offset:1px}`}</style>
 </main>;
}
