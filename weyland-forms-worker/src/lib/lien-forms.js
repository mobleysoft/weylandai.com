// weyland-docs-worker/src/lib/lien-forms.js
//
// LienX's waiver forms (2026-10-08). Where a state prints its lien waiver
// forms in its statutes, a waiver is enforceable only if it follows that
// form, so LienX fills the statutory form itself, word for word, and nothing
// else. The official text each form is copied from is kept next to this file
// (../../statutes/*.txt, fetched from the state legislature's own site), and
// test/lien-forms.test.mjs checks every form here against it: with the filled
// blanks taken out, the words must be the statute's words, in order.
//
// A form is a list of blocks:
//   { t: "title", text }            centered heading
//   { t: "field", label, key }      "Label: value" on its own line
//   { t: "para", text }             paragraph; {key} is a filled blank
//   { t: "notice", text }           the statute's required notice, in type at
//                                   least as large as the largest on the page
//   { t: "sign", lines: [...] }     signature block (statute's captions)
// Keys: amount, checkMaker, payee, owner, jobDescription, customer,
// throughDate, date, company, signer, signerTitle, project, jobNo,
// propertyName, propertyLocation, invoiceNumber, paymentPeriod,
// disputedAmount, propertyDescription, year.
//
// States that print statutory waiver forms LienX does not carry yet refuse a
// generic waiver (it would not be enforceable there) and say which statute
// to use. Every other state gets the general form, labelled as such.

export const FORM_KINDS = ["conditional_progress", "unconditional_progress", "conditional_final", "unconditional_final"];
export const KIND_LABEL = {
  conditional_progress: "Conditional, progress payment",
  unconditional_progress: "Unconditional, progress payment",
  conditional_final: "Conditional, final payment",
  unconditional_final: "Unconditional, final payment",
};

const AZ_WARRANT_PROGRESS = "The undersigned warrants that he either has already paid or will use the monies he receives from this progress payment to promptly pay in full all of his laborers, subcontractors, materialmen and suppliers for all work, materials, equipment or services provided for or to the above referenced project up to the date of this waiver.";
const AZ_RIGHTS = "any mechanic's lien, any state or federal statutory bond right, any private bond right, any claim for payment and any rights under any similar ordinance, rule or statute related to claim or payment rights for persons in the undersigned's position";
const AZ_NOTICE = "Notice: This document waives rights unconditionally and states that you have been paid for giving up those rights. This document is enforceable against you if you sign it, even if you have not been paid. If you have not been paid, use a conditional release form.";
const AZ_SIGN = (dateWord) => [{ label: dateWord, key: "date" }, { caption: "(Company name)", key: "company" }, { label: "By:", caption: "(Signature)", key: null }, { caption: "(Title)", key: "signerTitle" }];

const NV_RIGHTS = "any notice of lien, any private bond right, any claim for payment and any rights under any similar ordinance, rule or statute related to payment rights that the undersigned has on the above-described Property";
const NV_HEAD = [
  { t: "field", label: "Property Name:", key: "propertyName" },
  { t: "field", label: "Property Location:", key: "propertyLocation" },
  { t: "field", label: "Undersigned’s Customer:", key: "customer" },
  { t: "field", label: "Invoice/Payment Application Number:", key: "invoiceNumber" },
  { t: "field", label: "Payment Amount:", key: "amount" },
];
const NV_SIGN = [{ label: "Dated:", key: "date" }, { caption: "(Company Name)", key: "company" }, { label: "By:", key: null }, { label: "Its:", key: "signerTitle" }];
const NV_PROGRESS_EXTENT = "This release covers a progress payment for the work, materials or equipment furnished by the undersigned to the Property or to the Undersigned’s Customer which are the subject of the Invoice or Payment Application, but only to the extent of the Payment Amount or such portion of the Payment Amount as the undersigned is actually paid, and does not cover any retention withheld, any items, modifications or changes pending approval, disputed items and claims, or items furnished that are not paid.";

export const STATES = {
  AZ: {
    name: "Arizona",
    cite: "Ariz. Rev. Stat. § 33-1008(D)",
    source: "https://www.azleg.gov/ars/33/01008.htm",
    file: "az-33-1008.txt",
    note: "Arizona: a waiver is unenforceable unless it follows substantially the statutory form (A.R.S. § 33-1008). A conditional waiver releases only when there is evidence of payment.",
    forms: {
      conditional_progress: [
        { t: "title", text: "Conditional waiver and release on progress payment" },
        { t: "field", label: "Project:", key: "project" },
        { t: "field", label: "Job No.:", key: "jobNo" },
        { t: "para", text: `On receipt by the undersigned of a check from {checkMaker} in the sum of \${amount} payable to {payee} and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release ${AZ_RIGHTS} that the undersigned has on the job of {owner} located at {jobDescription} to the following extent. This release covers a progress payment for all labor, services, equipment or materials furnished to the jobsite or to {customer}, through {throughDate} only and does not cover any retention, pending modifications and changes or items furnished after that date. Before any recipient of this document relies on it, that person should verify evidence of payment to the undersigned.` },
        { t: "para", text: AZ_WARRANT_PROGRESS },
        { t: "sign", lines: AZ_SIGN("Date:") },
      ],
      unconditional_progress: [
        { t: "title", text: "Unconditional waiver and release on progress payment" },
        { t: "field", label: "Project:", key: "project" },
        { t: "field", label: "Job No.:", key: "jobNo" },
        { t: "para", text: `The undersigned has been paid and has received a progress payment in the sum of \${amount} for all labor, services, equipment or material furnished to the jobsite or to {customer} on the job of {owner} located at {jobDescription} and does hereby release ${AZ_RIGHTS} that the undersigned has on the above referenced project to the following extent. This release covers a progress payment for all labor, services, equipment or materials furnished to the jobsite or to {customer} through {throughDate} only and does not cover any retention, pending modifications and changes or items furnished after that date.` },
        { t: "para", text: AZ_WARRANT_PROGRESS },
        { t: "sign", lines: AZ_SIGN("Dated:") },
        { t: "notice", text: AZ_NOTICE },
      ],
      conditional_final: [
        { t: "title", text: "Conditional waiver and release on final payment" },
        { t: "field", label: "Project:", key: "project" },
        { t: "field", label: "Job No.:", key: "jobNo" },
        { t: "para", text: `On receipt by the undersigned of a check from {checkMaker} in the sum of \${amount} payable to {payee} and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release ${AZ_RIGHTS}, the undersigned has on the job of {owner} located at {jobDescription}. This release covers the final payment to the undersigned for all labor, services, equipment or materials furnished to the jobsite or to {customer}, except for disputed claims in the amount of \${disputedAmount}. Before any recipient of this document relies on it, the person should verify evidence of payment to the undersigned.` },
        { t: "para", text: "The undersigned warrants that he either has already paid or will use the monies he receives from this final payment to promptly pay in full all his laborers, subcontractors, materialmen and suppliers for all work, materials, equipment or services provided for or to the above referenced project up to the date of this waiver." },
        { t: "sign", lines: AZ_SIGN("Dated:") },
      ],
      unconditional_final: [
        { t: "title", text: "Unconditional waiver and release on final payment" },
        { t: "field", label: "Project:", key: "project" },
        { t: "field", label: "Job No.:", key: "jobNo" },
        { t: "para", text: `The undersigned has been paid in full for all labor, services, equipment or material furnished to the jobsite or to {customer}, on the job of {owner} located at {jobDescription} and does hereby waive and release any right to mechanic's lien, any state or federal statutory bond right, any private bond right, any claim for payment and any rights under any similar ordinance, rule or statute related to claim or payment rights for persons in the undersigned's position, except for disputed claims for extra work in the amount of \${disputedAmount}.` },
        { t: "para", text: "The undersigned warrants that he either has already paid or will use the monies he receives from this final payment to promptly pay in full all of his laborers, subcontractors, materialmen and suppliers for all work, materials, equipment or services provided for or to the above referenced project." },
        { t: "sign", lines: AZ_SIGN("Dated:") },
        { t: "notice", text: AZ_NOTICE },
      ],
    },
  },
  NV: {
    name: "Nevada",
    cite: "Nev. Rev. Stat. § 108.2457(5)",
    source: "https://www.leg.state.nv.us/NRS/NRS-108.html#NRS108Sec2457",
    file: "nv-108-2457.txt",
    note: "Nevada: a waiver and release is unenforceable unless it is in the statutory form (NRS 108.2457). If the check given for it does not clear, the waiver is void (NRS 108.2457(5)(e)).",
    forms: {
      conditional_progress: [
        { t: "title", text: "CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT" },
        ...NV_HEAD,
        { t: "para", text: `Upon receipt by the undersigned of a check in the above-referenced Payment Amount payable to the undersigned, and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release and the undersigned shall be deemed to waive ${NV_RIGHTS} to the following extent:` },
        { t: "para", text: `${NV_PROGRESS_EXTENT} Before any recipient of this document relies on it, the recipient should verify evidence of payment to the undersigned. The undersigned warrants that he or she either has already paid or will use the money received from this progress payment promptly to pay in full all laborers, subcontractors, materialmen and suppliers for all work, materials or equipment that are the subject of this waiver and release.` },
        { t: "sign", lines: NV_SIGN },
      ],
      unconditional_progress: [
        { t: "title", text: "UNCONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT" },
        ...NV_HEAD,
        { t: "para", text: `The undersigned has been paid and has received a progress payment in the above-referenced Payment Amount for all work, materials and equipment the undersigned furnished to the Customer for the above-described Property and does hereby waive and release ${NV_RIGHTS} to the following extent:` },
        { t: "para", text: `${NV_PROGRESS_EXTENT.replace("work, materials or equipment furnished", "work, materials and equipment furnished")} The undersigned warrants that he or she either has already paid or will use the money received from this progress payment promptly to pay in full all laborers, subcontractors, materialmen and suppliers for all work, materials or equipment that are the subject of this waiver and release.` },
        { t: "sign", lines: NV_SIGN },
        { t: "notice", text: "Notice: This document waives rights unconditionally and states that you have been paid for giving up those rights. This document is enforceable against you if you sign it to the extent of the Payment Amount or the amount received. If you have not been paid, use a conditional release form." },
      ],
      conditional_final: [
        { t: "title", text: "CONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT" },
        ...NV_HEAD,
        { t: "field", label: "Payment Period:", key: "paymentPeriod" },
        { t: "field", label: "Amount of Disputed Claims:", key: "disputedAmount" },
        { t: "para", text: `Upon receipt by the undersigned of a check in the above-referenced Payment Amount payable to the undersigned, and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release and the undersigned shall be deemed to waive ${NV_RIGHTS} to the following extent:` },
        { t: "para", text: "This release covers the final payment to the undersigned for all work, materials or equipment furnished by the undersigned to the Property or to the Undersigned’s Customer and does not cover payment for Disputed Claims, if any. Before any recipient of this document relies on it, the recipient should verify evidence of payment to the undersigned. The undersigned warrants that he or she either has already paid or will use the money received from the final payment promptly to pay in full all laborers, subcontractors, materialmen and suppliers for all work, materials or equipment that are the subject of this waiver and release." },
        { t: "sign", lines: NV_SIGN },
      ],
      unconditional_final: [
        { t: "title", text: "UNCONDITIONAL WAIVER AND RELEASE UPON FINAL PAYMENT" },
        ...NV_HEAD,
        { t: "field", label: "Amount of Disputed Claims:", key: "disputedAmount" },
        { t: "para", text: `The undersigned has been paid in full for all work, materials and equipment furnished to the Customer for the above-described Property and does hereby waive and release ${NV_RIGHTS}, except for the payment of Disputed Claims, if any, noted above. The undersigned warrants that he or she either has already paid or will use the money received from this final payment promptly to pay in full all laborers, subcontractors, materialmen and suppliers for all work, materials and equipment that are the subject of this waiver and release.` },
        { t: "sign", lines: NV_SIGN },
        { t: "notice", text: "Notice: This document waives rights unconditionally and states that you have been paid for giving up those rights. This document is enforceable against you if you sign it, even if you have not been paid. If you have not been paid, use a conditional release form." },
      ],
    },
  },
  FL: {
    name: "Florida",
    cite: "Fla. Stat. § 713.20(4)-(5)",
    source: "http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0700-0799/0713/Sections/0713.20.html",
    file: "fl-713-20.txt",
    note: "Florida prints one progress form and one final form; nobody may require a lienor to sign a different form (§ 713.20(6)). A lienor paid by check may condition the waiver on the check clearing (§ 713.20(7)). Conditional and unconditional below use the same statutory text.",
    kindsUseSameForm: true,
    forms: {
      progress: [
        { t: "title", text: "WAIVER AND RELEASE OF LIEN UPON PROGRESS PAYMENT" },
        { t: "para", text: "The undersigned lienor, in consideration of the sum of ${amount}, hereby waives and releases its lien and right to claim a lien for labor, services, or materials furnished through {throughDate} to {customer} on the job of {owner} to the following property:" },
        { t: "para", text: "{propertyDescription}" },
        { t: "para", text: "This waiver and release does not cover any retention or labor, services, or materials furnished after the date specified." },
        { t: "para", text: "DATED on {date}, {year}." },
        { t: "sign", lines: [{ caption: "(Lienor)", key: "company" }, { label: "By:", key: null }] },
      ],
      final: [
        { t: "title", text: "WAIVER AND RELEASE OF LIEN UPON FINAL PAYMENT" },
        { t: "para", text: "The undersigned lienor, in consideration of the final payment in the amount of ${amount}, hereby waives and releases its lien and right to claim a lien for labor, services, or materials furnished to {customer} on the job of {owner} to the following described property:" },
        { t: "para", text: "{propertyDescription}" },
        { t: "para", text: "DATED on {date}, {year}." },
        { t: "sign", lines: [{ caption: "(Lienor)", key: "company" }, { label: "By:", key: null }] },
      ],
    },
  },
};

// States whose statutes print waiver forms LienX does not carry yet: a
// generic waiver is refused there.
export const STATUTORY_NOT_CARRIED = {
  CA: "California Civil Code §§ 8132-8138",
  TX: "Texas Property Code § 53.284",
  GA: "Georgia Code § 44-14-366",
  MI: "Michigan Compiled Laws § 570.1115",
  MS: "Mississippi Code § 85-7-433",
  UT: "Utah Code § 38-1a-802",
  WY: "Wyoming Statutes § 29-10-101",
};

/** The blocks for a state and kind, or { refused } / { generic }. */
export function formFor(state, kind) {
  const st = STATES[state];
  if (st) {
    if (st.kindsUseSameForm) return { state: st, blocks: st.forms[/final/.test(kind) ? "final" : "progress"], statutory: true };
    return { state: st, blocks: st.forms[kind] || st.forms.conditional_progress, statutory: true };
  }
  if (STATUTORY_NOT_CARRIED[state]) return { refused: `This state prints its own lien waiver forms (${STATUTORY_NOT_CARRIED[state]}); a waiver in any other form may not be enforceable there. LienX does not carry that state's form yet: use the statutory form.` };
  return { generic: true, blocks: genericForm(kind) };
}

function genericForm(kind) {
  const final = /final/.test(kind), cond = /^conditional/.test(kind);
  const title = `${cond ? "Conditional" : "Unconditional"} Waiver and Release on ${final ? "Final" : "Progress"} Payment`;
  const pay = cond ? "Upon receipt by the undersigned of payment from {checkMaker} in the sum of ${amount}, and when that payment has cleared, this document becomes effective to release" : (final ? "The undersigned has been paid in full and releases" : "The undersigned has been paid and has received a progress payment in the sum of ${amount} and releases");
  const extent = final ? "for all labor, services, equipment or material furnished to {customer} on the job of {owner} located at {jobDescription}, except for disputed claims in the amount of ${disputedAmount}." : "to the extent of that payment for labor, services, equipment or material furnished to {customer} on the job of {owner} located at {jobDescription} through {throughDate} only. It does not cover retention, pending changes or items furnished after that date.";
  return [
    { t: "title", text: title },
    { t: "field", label: "Project:", key: "project" },
    { t: "para", text: `${pay} any mechanic's lien, bond right or payment claim the undersigned has ${extent}` },
    { t: "sign", lines: [{ label: "Dated:", key: "date" }, { caption: "(Company)", key: "company" }, { label: "By:", key: null }, { caption: "(Title)", key: "signerTitle" }] },
    ...(cond ? [] : [{ t: "notice", text: "Notice: This document waives rights unconditionally and states that you have been paid for giving up those rights. If you have not been paid, use a conditional release form." }]),
  ];
}

/** Fill {key} blanks; an empty value stays a blank line. */
export function fill(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (_, k) => {
    const v = values[k];
    if (v == null || String(v).trim() === "") return "______________";
    return String(v);
  });
}

export function moneyText(v) {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}
