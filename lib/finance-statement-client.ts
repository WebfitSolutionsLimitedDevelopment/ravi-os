'use client'

export type PromoBalance={label:string;startDate:string;rate:string;rateApplicableUntil:string;purchaseAmount:number;amountOwing:number}
export type StatementExtract={
  documentType:'credit_card_statement'|'bank_statement'|'payslip'|'other'
  institution:string;accountLabel:string;currency:string
  statementStart:string|null;statementEnd:string|null
  closingBalance:number|null;minimumDue:number|null;paymentDueDate:string|null
  creditLimit:number|null;openingBalance:number|null
  promoBalances:PromoBalance[]
  ordinaryBalance:number|null
  interestCharged:number|null
  standardPurchaseRate:number|null;standardCashAdvanceRate:number|null
  recommendedPayment:number|null;recommendedPaymentNote:string
  payslip:{employer:string;payDate:string;grossPay:number;netPay:number}|null
  confidence:number;engine?:string;rawExtract?:any
}

function fileToDataUrl(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onerror=()=>reject(new Error('Unable to read that file'))
    reader.onload=()=>resolve(String(reader.result||''))
    reader.readAsDataURL(file)
  })
}

function compressedImageDataUrl(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader()
    reader.onerror=()=>reject(new Error('Unable to read image'))
    reader.onload=()=>{
      const img=new Image()
      img.onerror=()=>reject(new Error('Unable to decode image'))
      img.onload=()=>{
        const max=1800
        const scale=Math.min(1,max/Math.max(img.width,img.height))
        const canvas=document.createElement('canvas')
        canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale))
        const ctx=canvas.getContext('2d');if(!ctx)return reject(new Error('Unable to process image'))
        ctx.drawImage(img,0,0,canvas.width,canvas.height)
        resolve(canvas.toDataURL('image/jpeg',0.85))
      }
      img.src=String(reader.result||'')
    }
    reader.readAsDataURL(file)
  })
}

export async function extractStatement(file:File):Promise<StatementExtract>{
  const isPdf=file.type==='application/pdf'
  const fileDataUrl=isPdf?await fileToDataUrl(file):await compressedImageDataUrl(file)
  const response=await fetch('/api/finance/statement-extract',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({file:fileDataUrl})})
  const data=await response.json().catch(()=>({}))
  if(!response.ok)throw new Error(data.error||'Could not read that document')
  return data as StatementExtract
}
