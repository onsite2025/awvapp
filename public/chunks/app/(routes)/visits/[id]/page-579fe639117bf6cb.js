(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[6183],{6865:(e,t,s)=>{"use strict";s.d(t,{A:()=>l});var r=s(12115);let l=r.forwardRef(function(e,t){let{title:s,titleId:l,...a}=e;return r.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:t,"aria-labelledby":l},a),s?r.createElement("title",{id:l},s):null,r.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"}))})},27206:(e,t,s)=>{"use strict";s.r(t),s.d(t,{default:()=>f});var r=s(95155),l=s(12115),a=s(35695),i=s(6874),n=s.n(i),d=s(23464),o=s(74065),c=s(6865),m=s(82771);let x=l.forwardRef(function(e,t){let{title:s,titleId:r,...a}=e;return l.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:t,"aria-labelledby":r},a),s?l.createElement("title",{id:r},s):null,l.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M15.75 19.5 8.25 12l7.5-7.5"}))});var h=s(61316);let u=l.forwardRef(function(e,t){let{title:s,titleId:r,...a}=e;return l.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:t,"aria-labelledby":r},a),s?l.createElement("title",{id:r},s):null,l.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0 1 18 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3 1.5 1.5 3-3.75"}))}),g=l.forwardRef(function(e,t){let{title:s,titleId:r,...a}=e;return l.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:t,"aria-labelledby":r},a),s?l.createElement("title",{id:r},s):null,l.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"}))});function f(){let e=(0,a.useParams)(),t=(0,a.useRouter)(),s=(0,o.d)(),i="string"==typeof(null==e?void 0:e.id)?e.id:"",[f,p]=(0,l.useState)(null),[v,j]=(0,l.useState)(!0),[w,b]=(0,l.useState)(null);(0,l.useEffect)(()=>{N()},[i]);let N=async()=>{if(i)try{j(!0),b(null);let e=await d.A.get("/api/visits/".concat(i));p(e.data),console.log("Visit data loaded:",e.data)}catch(e){console.error("Failed to load visit data:",e),b("Failed to load visit: ".concat(e.message||"Unknown error")),s.error("Error loading visit details")}finally{j(!1)}},y=e=>new Date(e).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"});return v?(0,r.jsxs)("div",{className:"min-h-screen flex items-center justify-center",children:[(0,r.jsx)("div",{className:"animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"}),(0,r.jsx)("p",{className:"ml-3 text-lg text-gray-600",children:"Loading visit details..."})]}):w?(0,r.jsxs)("div",{className:"min-h-screen flex flex-col items-center justify-center p-4",children:[(0,r.jsxs)("div",{className:"bg-red-50 text-red-800 p-4 rounded-lg mb-4 max-w-lg w-full",children:[(0,r.jsx)("h2",{className:"text-lg font-semibold mb-2",children:"Error Loading Visit"}),(0,r.jsx)("p",{children:w})]}),(0,r.jsx)("button",{onClick:N,className:"px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700",children:"Try Again"}),(0,r.jsx)("button",{onClick:()=>t.push("/visits"),className:"mt-3 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50",children:"Back to Visits"})]}):f?(0,r.jsxs)("div",{className:"container mx-auto px-4 py-8",children:[(0,r.jsxs)("div",{className:"mb-8",children:[(0,r.jsxs)("div",{className:"flex items-center justify-between",children:[(0,r.jsxs)("button",{onClick:()=>t.push("/visits"),className:"inline-flex items-center text-gray-600 hover:text-gray-800",children:[(0,r.jsx)(x,{className:"h-5 w-5 mr-1"}),"Back to Visits"]}),(e=>{switch(null==e?void 0:e.toLowerCase()){case"completed":return(0,r.jsxs)("span",{className:"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800",children:[(0,r.jsx)(c.A,{className:"h-4 w-4 mr-1"}),"Completed"]});case"in_progress":return(0,r.jsxs)("span",{className:"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800",children:[(0,r.jsx)(m.A,{className:"h-4 w-4 mr-1"}),"In Progress"]});default:return(0,r.jsx)("span",{className:"inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800",children:e||"Unknown"})}})(f.status)]}),(0,r.jsx)("h1",{className:"text-2xl font-bold text-gray-800 mt-4",children:"Visit Details"})]}),(0,r.jsx)("div",{className:"bg-white shadow-md rounded-lg overflow-hidden mb-8",children:(0,r.jsxs)("div",{className:"p-6",children:[(0,r.jsxs)("div",{className:"flex flex-col md:flex-row justify-between mb-6",children:[(0,r.jsxs)("div",{children:[(0,r.jsx)("h2",{className:"text-xl font-semibold text-gray-800",children:f.patientName}),(0,r.jsx)("p",{className:"text-gray-600 mt-1",children:y(f.date)})]}),(0,r.jsx)("div",{className:"mt-4 md:mt-0",children:(0,r.jsxs)(n(),{href:"/visits/".concat(i,"/edit"),className:"inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-50",children:[(0,r.jsx)(h.A,{className:"h-4 w-4 mr-1"}),"Edit Visit"]})})]}),(0,r.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-6",children:[(0,r.jsxs)("div",{children:[(0,r.jsx)("h3",{className:"text-md font-medium text-gray-700 mb-2",children:"Visit Information"}),(0,r.jsxs)("dl",{className:"space-y-1",children:[(0,r.jsxs)("div",{className:"flex",children:[(0,r.jsx)("dt",{className:"w-32 text-gray-500",children:"Template:"}),(0,r.jsx)("dd",{className:"flex-1 text-gray-800",children:f.templateName||"N/A"})]}),(0,r.jsxs)("div",{className:"flex",children:[(0,r.jsx)("dt",{className:"w-32 text-gray-500",children:"Provider:"}),(0,r.jsx)("dd",{className:"flex-1 text-gray-800",children:f.providerName||"N/A"})]}),(0,r.jsxs)("div",{className:"flex",children:[(0,r.jsx)("dt",{className:"w-32 text-gray-500",children:"Created:"}),(0,r.jsx)("dd",{className:"flex-1 text-gray-800",children:f.createdAt?y(f.createdAt):"N/A"})]}),(0,r.jsxs)("div",{className:"flex",children:[(0,r.jsx)("dt",{className:"w-32 text-gray-500",children:"Updated:"}),(0,r.jsx)("dd",{className:"flex-1 text-gray-800",children:f.updatedAt?y(f.updatedAt):"N/A"})]})]})]}),(0,r.jsxs)("div",{children:[(0,r.jsx)("h3",{className:"text-md font-medium text-gray-700 mb-2",children:"Actions"}),(0,r.jsxs)("div",{className:"space-y-3",children:["in_progress"===f.status&&(0,r.jsx)(n(),{href:"/visits/".concat(i,"/questions"),className:"block w-full md:w-auto text-center md:inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700",children:"Continue Visit"}),(0,r.jsx)(n(),{href:"/visits/".concat(i,"/summary"),className:"block w-full md:w-auto text-center md:inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700",children:"View Response Summary"}),"completed"===f.status&&(0,r.jsxs)(n(),{href:"/visits/".concat(i,"/plan"),className:"block w-full md:w-auto text-center md:inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700",children:[(0,r.jsx)(u,{className:"h-5 w-5 mr-2"}),"View Health Plan"]})]})]})]})]})}),f.responses&&f.responses.length>0?(0,r.jsxs)("div",{className:"mt-8",children:[(0,r.jsx)("h2",{className:"text-xl font-semibold text-gray-800 mb-4",children:"Responses"}),(0,r.jsx)("div",{className:"space-y-4",children:f.responses.map((e,t)=>{var s;return(0,r.jsxs)("div",{className:"bg-white shadow rounded-md p-4",children:[(0,r.jsx)("h3",{className:"font-medium text-gray-800",children:(null===(s=e.question)||void 0===s?void 0:s.text)||"Question"}),(0,r.jsx)("p",{className:"mt-2 text-gray-600",children:"string"==typeof e.answer||"number"==typeof e.answer?e.answer:JSON.stringify(e.answer)})]},t)})})]}):"completed"!==f.status&&(0,r.jsxs)("div",{className:"bg-yellow-50 p-4 rounded-md flex items-start mt-8",children:[(0,r.jsx)(g,{className:"h-5 w-5 text-yellow-600 mt-0.5 mr-2"}),(0,r.jsxs)("div",{children:[(0,r.jsx)("h3",{className:"font-medium text-yellow-800",children:"No responses yet"}),(0,r.jsxs)("p",{className:"text-yellow-700 mt-1",children:["This visit has no responses yet. ","in_progress"===f.status&&"Continue the visit to add responses."]})]})]})]}):(0,r.jsx)("div",{className:"min-h-screen flex items-center justify-center",children:(0,r.jsx)("p",{className:"text-lg text-gray-600",children:"No visit data available. Please try again."})})}},72163:(e,t,s)=>{Promise.resolve().then(s.bind(s,27206))},74065:(e,t,s)=>{"use strict";s.d(t,{d:()=>l});var r=s(13568);let l=()=>({success:e=>r.oR.success(e),error:e=>r.oR.error(e),warning:e=>(0,r.oR)(e,{icon:"⚠️",style:{backgroundColor:"#FFFBEB",color:"#92400E",border:"1px solid #FEF3C7"}}),info:e=>(0,r.oR)(e,{icon:"ℹ️",style:{backgroundColor:"#EFF6FF",color:"#1E40AF",border:"1px solid #DBEAFE"}})})},82771:(e,t,s)=>{"use strict";s.d(t,{A:()=>l});var r=s(12115);let l=r.forwardRef(function(e,t){let{title:s,titleId:l,...a}=e;return r.createElement("svg",Object.assign({xmlns:"http://www.w3.org/2000/svg",fill:"none",viewBox:"0 0 24 24",strokeWidth:1.5,stroke:"currentColor","aria-hidden":"true","data-slot":"icon",ref:t,"aria-labelledby":l},a),s?r.createElement("title",{id:l},s):null,r.createElement("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"}))})}},e=>{var t=t=>e(e.s=t);e.O(0,[6874,7131,7356,8441,1684,7358],()=>t(72163)),_N_E=e.O()}]);