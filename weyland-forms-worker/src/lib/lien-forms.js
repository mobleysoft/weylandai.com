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


const TX_RIGHTS = "any mechanic's lien right, any right arising from a payment bond that complies with a state or federal statute, any common law payment bond right, any claim for payment, and any rights under any similar ordinance, rule, or statute related to claim or payment rights for persons in the signer's position";
const TX_HEAD = [{ t: "field", label: "Project", key: "project" }, { t: "field", label: "Job No.", key: "jobNo" }];
const TX_SIGN = [{ label: "Date", key: "date" }, { caption: "(Company name)", key: "company" }, { label: "By", caption: "(Signature)", key: null }, { caption: "(Title)", key: "signerTitle" }];
const TX_NOTICE = "NOTICE: This document waives rights unconditionally and states that you have been paid for giving up those rights. It is prohibited for a person to require you to sign this document if you have not been paid the payment amount set forth below. If you have not been paid, use a conditional release form.";
const TX_PROGRESS_COVERS = "This release covers a progress payment for all labor, services, equipment, or materials furnished to the property or to {customer} (person with whom signer contracted) as indicated in the attached statement(s) or progress payment request(s), except for unpaid retention, pending modifications and changes, or other items furnished.";
const TX_WARRANT_PROGRESS = "The signer warrants that the signer has already paid or will use the funds received from this progress payment to promptly pay in full all of the signer's laborers, subcontractors, materialmen, and suppliers for all work, materials, equipment, or services provided for or to the above referenced project in regard to the attached statement(s) or progress payment request(s).";
const TX_WARRANT_FINAL = "The signer warrants that the signer has already paid or will use the funds received from this final payment to promptly pay in full all of the signer's laborers, subcontractors, materialmen, and suppliers for all work, materials, equipment, or services provided for or to the above referenced project up to the date of this waiver and release.";
const TX_VERIFY = "Before any recipient of this document relies on this document, the recipient should verify evidence of payment to the signer.";
const TX_ON_CHECK = `On receipt by the signer of this document of a check from {checkMaker} (maker of check) in the sum of \${amount} payable to {payee} (payee or payees of check) and when the check has been properly endorsed and has been paid by the bank on which it is drawn, this document becomes effective to release ${TX_RIGHTS} that the signer has on the property of {owner} (owner) located at {propertyLocation} (location) to the following extent: {jobDescription} (job description).`;

// Michigan (MCL 570.1115(9)): "(circle one) does does not" is a choice blank,
// {coversAll:does|does not}; the chosen word is marked, or both are left to circle.
const MI_COVERS = "This waiver, together with all previous waivers, if any, (circle one) {coversAll:does|does not} cover all amounts due to me/us for contract improvement provided through the date shown above.";
const MI_RESIDENTIAL = "If the improvement is provided to property that is a residential structure and if the owner or lessee of the property or the owner's or lessee's designee has received a notice of furnishing from me/one of us or if I/we are not required to provide one, and the owner, lessee, or designee has not received this waiver directly from me/one of us, the owner, lessee, or designee may not rely upon it without contacting me/one of us, either in writing, by telephone, or personally, to verify that it is authentic.";
const MI_SIGN = [{ key: "company" }, { caption: "(signature of lien claimant)", key: null }, { label: "Signed on:", caption: "(date)", key: "date" }, { label: "Address:", key: "claimantAddress" }, { label: "Telephone:", key: "claimantPhone" }];
const MI_NOTICE = "DO NOT SIGN BLANK OR INCOMPLETE FORMS. RETAIN A COPY.";
const MI_PARTIAL = (sep) => `I/we have a contract with {customer} (other contracting party) to provide {jobDescription} for the improvement to the property described as${sep} {propertyDescription}, and by signing this waiver waive my/our construction lien to the amount of \${amount}, for labor/materials provided through {throughDate} (date).`;
const MI_FULL = "My/our contract with {customer} (other contracting party) to provide {jobDescription} for the improvement of the property described as: {propertyDescription} has been fully paid and satisfied. By signing this waiver, all my/our construction lien rights against the described property are waived and released.";

// Wyoming (W.S. 29-10-101(b)) prints one lien waiver for every payment, with
// a notary's acknowledgment; the notary's own blanks are left for the notary.
const WY_FORM = [
  { t: "para", text: "Note to lien claimant: Signing this form has legal implications. If you have any questions regarding how to complete this form or whether it has been properly completed, you should consult an attorney." },
  { t: "title", text: "LIEN WAIVER" },
  { t: "field", label: "TO:", key: "customer" },
  { t: "field", label: "PROJECT:", key: "project" },
  { t: "field", label: "FROM:", key: "company" },
  { t: "field", label: "DATE:", key: "date" },
  { t: "field", label: "PAYMENT:", key: "amount" },
  { t: "para", text: "In consideration of the PAYMENT received to date, the undersigned does hereby waive, release, and relinquish any and all claim and/or right of lien against the project and the real property improvements thereto for labor and/or materials furnished for use in construction of the project; provided however, the undersigned reserves all claims and/or rights of lien as to monies withheld as retainage in the amount of ${retainage}, and any labor and/or materials hereafter furnished for which payment has not yet been made. The undersigned has not been paid the sum of ${unpaidAmount} for work performed and/or materials provided under contract on this project and retains the right to file a lien against the property and pursue any and all actions to recover the full amount due, including any and all equitable claims. The undersigned acknowledges receipt of payment for work performed or materials provided and acknowledges that this waiver may be relied upon by the owner even if the undersigned accepts payment in uncertified funds and such payment is subsequently dishonored or revoked, in which case this lien waiver shall remain in full force and effect. The foregoing waiver shall not apply, however, if payment tendered by the owner is dishonored or revoked." },
  { t: "sign", lines: [{ label: "By:", caption: "subcontractor/materialman/employee", key: null }, { label: "Title:", key: "signerTitle" }, { label: "Date:", key: "date" }] },
  { t: "para", text: "STATE OF __________________ ) )ss. COUNTY OF ________________ )" },
  { t: "para", text: "This instrument was acknowledged before me on this _____ day of _____________, 20___, by _____________________ (name of person) as lien claimant or ______________________ (title, position or type of authority granted by lien claimant) of {company} (lien claimant)." },
  { t: "para", text: "IN WITNESS THEREOF, I have hereunto set my hand and affixed my official seal on the day and year last above written." },
  { t: "sign", lines: [{ caption: "Notarial officer", key: null }, { label: "My Commission Expires:", key: null }, { label: "Seal:", key: null }] },
];

// California (Civ. Code §§ 8132-8138): a waiver not in substantially the
// statutory form is null, void and unenforceable. Section headings are the
// statute's; the Notice to Claimant prints at least as large as anything else.
const CA_COND_NOTICE = "NOTICE: THIS DOCUMENT WAIVES THE CLAIMANT’S LIEN, STOP PAYMENT NOTICE, AND PAYMENT BOND RIGHTS EFFECTIVE ON RECEIPT OF PAYMENT. A PERSON SHOULD NOT RELY ON THIS DOCUMENT UNLESS SATISFIED THAT THE CLAIMANT HAS RECEIVED PAYMENT.";
const CA_UNCOND_NOTICE = "NOTICE TO CLAIMANT: THIS DOCUMENT WAIVES AND RELEASES LIEN, STOP PAYMENT NOTICE, AND PAYMENT BOND RIGHTS UNCONDITIONALLY AND STATES THAT YOU HAVE BEEN PAID FOR GIVING UP THOSE RIGHTS. THIS DOCUMENT IS ENFORCEABLE AGAINST YOU IF YOU SIGN IT, EVEN IF YOU HAVE NOT BEEN PAID. IF YOU HAVE NOT BEEN PAID, USE A CONDITIONAL WAIVER AND RELEASE FORM.";
const CA_ID = (through) => [
  { t: "title", text: "Identifying Information" },
  { t: "field", label: "Name of Claimant:", key: "company" },
  { t: "field", label: "Name of Customer:", key: "customer" },
  { t: "field", label: "Job Location:", key: "propertyLocation" },
  { t: "field", label: "Owner:", key: "owner" },
  ...(through ? [{ t: "field", label: "Through Date:", key: "throughDate" }] : []),
];
const CA_CHANGE_ORDERS = "Rights based upon labor or service provided, or equipment or material delivered, pursuant to a written change order that has been fully executed by the parties prior to the date that this document is signed by the claimant, are waived and released by this document, unless listed as an Exception below.";
const CA_CHECK = [
  { t: "field", label: "Maker of Check:", key: "checkMaker" },
  { t: "field", label: "Amount of Check:", key: "amount" },
  { t: "field", label: "Check Payable to:", key: "payee" },
];
const CA_PROGRESS_WAIVES = "This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job through the Through Date of this document.";
const CA_CHECK_EFFECTIVE = "This document is effective only on the claimant’s receipt of payment from the financial institution on which the following check is drawn:";
const CA_CONTRACT_RIGHTS = "Contract rights, including (A) a right based on rescission, abandonment, or breach of contract, and (B) the right to recover compensation for work not compensated by the payment.";
const CA_SIGN = [
  { t: "title", text: "Signature" },
  { t: "sign", lines: [{ label: "Claimant’s Signature:", key: null }, { label: "Claimant’s Title:", key: "signerTitle" }, { label: "Date of Signature:", key: "date" }] },
];

// Utah (Code § 38-1a-802(4)) prints a progress and a final form; both take
// effect only once the check is endorsed and paid.
const UT_HEAD = (period) => [
  { t: "field", label: "Property Name:", key: "propertyName" },
  { t: "field", label: "Property Location:", key: "propertyLocation" },
  { t: "field", label: "Undersigned's Customer:", key: "customer" },
  { t: "field", label: "Invoice/Payment Application Number:", key: "invoiceNumber" },
  { t: "field", label: "Payment Amount:", key: "amount" },
  ...(period ? [{ t: "field", label: "Payment Period:", key: "paymentPeriod" }] : []),
];
const UT_RELEASE = "To the extent provided below, this document becomes effective to release and the undersigned is considered to waive any notice of lien or right under Utah Code Ann., Title 38, Chapter 1a, Preconstruction and Construction Liens, or any bond right under Utah Code Ann., Title 14, Contractors' Bonds, or Section 63G-6a-1103 related to payment rights the undersigned has on the above described Property once: (1) the undersigned endorses a check in the above referenced Payment Amount payable to the undersigned; and (2) the check is paid by the depository institution on which it is drawn.";
const UT_WARRANT = (which) => `The undersigned warrants that the undersigned either has already paid or will use the money the undersigned receives from ${which} promptly to pay in full all the undersigned's laborers, subcontractors, materialmen, and suppliers for all work, materials, equipment, or combination of work, materials, and equipment that are the subject of this waiver and release.`;
const UT_SIGN = [{ label: "Dated:", key: "date" }, { caption: "(Company Name)", key: "company" }, { label: "By:", key: null }, { label: "Its:", key: "signerTitle" }];

// Georgia (O.C.G.A. § 44-14-366(c), (e), as revised by SB 315, eff. 2021) and
// Mississippi (Miss. Code § 85-7-433(1), (2), from SB 2622 of 2014) print the
// same mechanic/materialman form, each with a notice that must be on its face.
const SOUTH_EMPLOYED = "THE UNDERSIGNED MECHANIC AND/OR MATERIALMAN HAS BEEN EMPLOYED BY {customer} (NAME OF CONTRACTOR) TO FURNISH {jobDescription} (DESCRIBE MATERIALS AND/OR LABOR) FOR THE CONSTRUCTION OF IMPROVEMENTS KNOWN AS {project} (TITLE OF THE PROJECT OR BUILDING) WHICH IS LOCATED IN THE CITY OF {city}, COUNTY OF {county}, AND IS OWNED BY {owner} (NAME OF OWNER) AND MORE PARTICULARLY DESCRIBED AS FOLLOWS:";
const SOUTH_DESCRIBE = "(DESCRIBE THE PROPERTY UPON WHICH THE IMPROVEMENTS WERE MADE BY USING EITHER A METES AND BOUNDS DESCRIPTION, THE LAND LOT DISTRICT, BLOCK AND LOT NUMBER, OR STREET ADDRESS OF THE PROJECT.)";
const SOUTH_INTERIM = "UPON THE RECEIPT OF THE SUM OF ${amount}, THE MECHANIC AND/OR MATERIALMAN WAIVES AND RELEASES ANY AND ALL LIENS OR CLAIMS OF LIENS IT HAS UPON THE FOREGOING DESCRIBED PROPERTY OR ANY RIGHTS AGAINST ANY LABOR AND/OR MATERIAL BOND THROUGH THE DATE OF {throughDate} (DATE) AND EXCEPTING THOSE RIGHTS AND LIENS THAT THE MECHANIC AND/OR MATERIALMAN MIGHT HAVE IN ANY RETAINED AMOUNTS, ON ACCOUNT OF LABOR OR MATERIALS, OR BOTH, FURNISHED BY THE UNDERSIGNED TO OR ON ACCOUNT OF SAID CONTRACTOR FOR SAID BUILDING OR PREMISES.";
const SOUTH_FINAL = "UPON THE RECEIPT OF THE SUM OF ${amount}, THE MECHANIC AND/OR MATERIALMAN WAIVES AND RELEASES ANY AND ALL LIENS OR CLAIMS OF LIENS IT HAS UPON THE FOREGOING DESCRIBED PROPERTY OR ANY RIGHTS AGAINST ANY LABOR AND/OR MATERIAL BOND ON ACCOUNT OF LABOR OR MATERIALS, OR BOTH, FURNISHED BY THE UNDERSIGNED TO OR ON ACCOUNT OF SAID CONTRACTOR FOR SAID PROPERTY.";
const SOUTH_HEAD = (state) => [{ t: "para", text: `STATE OF ${state}` }, { t: "field", label: "COUNTY OF", key: "county" }, { t: "para", text: SOUTH_EMPLOYED }, { t: "para", text: "{propertyDescription}" }, { t: "para", text: SOUTH_DESCRIBE }];
const GA_NOTICE = "NOTICE: WHEN YOU EXECUTE AND SUBMIT THIS DOCUMENT, YOU SHALL BE CONCLUSIVELY DEEMED TO HAVE WAIVED AND RELEASED ANY AND ALL LIENS AND CLAIMS OF LIENS UPON THE FOREGOING DESCRIBED PROPERTY AND ANY RIGHTS REGARDING ANY LABOR OR MATERIAL BOND REGARDING THE SAID PROPERTY TO THE EXTENT (AND ONLY TO THE EXTENT) SET FORTH ABOVE, EVEN IF YOU HAVE NOT ACTUALLY RECEIVED SUCH PAYMENT, 90 DAYS AFTER THE DATE STATED ABOVE UNLESS YOU FILE AN AFFIDAVIT OF NONPAYMENT PRIOR TO THE EXPIRATION OF SUCH 90 DAY PERIOD. THE FAILURE TO INCLUDE THIS NOTICE LANGUAGE ON THE FORM SHALL RENDER THE FORM UNENFORCEABLE AND INVALID AS A WAIVER AND RELEASE UNDER O.C.G.A. § 44-14-366.";
const GA_TAIL = [
  { t: "para", text: "GIVEN UNDER HAND AND SEAL THIS {dateDay} DAY OF {dateMonth}, {year}." },
  { t: "sign", lines: [{ caption: "(SEAL)", key: null }, { key: "company" }, { caption: "(WITNESS)", key: null }, { caption: "(ADDRESS)", key: null }] },
  { t: "notice", text: GA_NOTICE },
];
const MS_NOTICE = "NOTICE: WHEN YOU EXECUTE AND SUBMIT THIS DOCUMENT, YOU SHALL BE CONCLUSIVELY DEEMED TO HAVE BEEN PAID IN FULL THE AMOUNT STATED ABOVE, EVEN IF YOU HAVE NOT ACTUALLY RECEIVED THE PAYMENT, SIXTY (60) DAYS AFTER THE DATE STATED ABOVE UNLESS YOU FILE EITHER AN AFFIDAVIT OF NONPAYMENT OR A CLAIM OF LIEN BEFORE THE EXPIRATION OF THE SIXTY-DAY PERIOD. THE FAILURE TO INCLUDE THIS NOTICE LANGUAGE ON THE FACE OF THE FORM SHALL RENDER THE FORM UNENFORCEABLE AND INVALID AS A WAIVER AND RELEASE UNDER SECTION 85-7-419, MISSISSIPPI CODE OF 1972.";
const MS_TAIL = [
  { t: "sign", lines: [{ caption: "SIGNATURE", key: null }, { label: "BY:", caption: "(PRINT NAME)", key: "signer" }, { label: "ITS:", caption: "(PRINT TITLE)", key: "signerTitle" }] },
  { t: "para", text: "SWORN TO AND SUBSCRIBED BEFORE ME, THIS THE ____ DAY OF _________, 20__." },
  { t: "sign", lines: [{ caption: "NOTARY PUBLIC", key: null }] },
  { t: "notice", text: MS_NOTICE },
];

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
  TX: {
    name: "Texas",
    cite: "Tex. Prop. Code § 53.284",
    source: "https://statutes.capitol.texas.gov/Docs/PR/htm/PR.53.htm#53.284",
    file: "tx-53-284.txt",
    note: "Texas: a waiver and release is unenforceable unless it substantially complies with the statutory form (Tex. Prop. Code § 53.284). The unconditional forms carry the required notice at the top, in bold type at least as large as the largest on the page. It is prohibited to require an unconditional waiver from someone who has not been paid.",
    forms: {
      conditional_progress: [
        { t: "title", text: "CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT" }, ...TX_HEAD,
        { t: "para", text: TX_ON_CHECK },
        { t: "para", text: TX_PROGRESS_COVERS },
        { t: "para", text: TX_VERIFY },
        { t: "para", text: TX_WARRANT_PROGRESS },
        { t: "sign", lines: TX_SIGN },
      ],
      unconditional_progress: [
        { t: "notice", text: TX_NOTICE },
        { t: "title", text: "UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT" }, ...TX_HEAD,
        { t: "para", text: `The signer of this document has been paid and has received a progress payment in the sum of \${amount} for all labor, services, equipment, or materials furnished to the property or to {customer} (person with whom signer contracted) on the property of {owner} (owner) located at {propertyLocation} (location) to the following extent: {jobDescription} (job description). The signer therefore waives and releases ${TX_RIGHTS} that the signer has on the above referenced project to the following extent:` },
        { t: "para", text: TX_PROGRESS_COVERS },
        { t: "para", text: TX_WARRANT_PROGRESS },
        { t: "sign", lines: TX_SIGN },
      ],
      conditional_final: [
        { t: "title", text: "CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT" }, ...TX_HEAD,
        { t: "para", text: TX_ON_CHECK },
        { t: "para", text: "This release covers the final payment to the signer for all labor, services, equipment, or materials furnished to the property or to {customer} (person with whom signer contracted)." },
        { t: "para", text: TX_VERIFY },
        { t: "para", text: TX_WARRANT_FINAL },
        { t: "sign", lines: TX_SIGN },
      ],
      unconditional_final: [
        { t: "notice", text: TX_NOTICE },
        { t: "title", text: "UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT" }, ...TX_HEAD,
        { t: "para", text: `The signer of this document has been paid in full for all labor, services, equipment, or materials furnished to the property or to {customer} (person with whom signer contracted) on the property of {owner} (owner) located at {propertyLocation} (location) to the following extent: {jobDescription} (job description). The signer therefore waives and releases ${TX_RIGHTS}.` },
        { t: "para", text: TX_WARRANT_FINAL },
        { t: "sign", lines: TX_SIGN },
      ],
    },
  },
  MI: {
    name: "Michigan",
    cite: "Mich. Comp. Laws § 570.1115(9)",
    source: "https://www.legislature.mi.gov/Laws/MCL?objectName=mcl-570-1115",
    file: "mi-570-1115.txt",
    noticeInline: true,
    note: "Michigan: lien waivers are executed on the statutory forms in substantially their format (MCL 570.1115(9)). A conditional waiver takes effect on payment of the amount shown; on a residential structure the owner must verify a waiver not received directly from you.",
    forms: {
      conditional_progress: [
        { t: "title", text: "PARTIAL CONDITIONAL WAIVER" },
        { t: "para", text: MI_PARTIAL(":") },
        { t: "para", text: MI_COVERS + " This waiver is conditioned on actual payment of the amount shown above." },
        { t: "para", text: MI_RESIDENTIAL },
        { t: "sign", lines: MI_SIGN },
        { t: "notice", text: MI_NOTICE },
      ],
      unconditional_progress: [
        { t: "title", text: "PARTIAL UNCONDITIONAL WAIVER" },
        { t: "para", text: MI_PARTIAL("") },
        { t: "para", text: MI_COVERS + " " + MI_RESIDENTIAL },
        { t: "sign", lines: MI_SIGN },
        { t: "notice", text: MI_NOTICE },
      ],
      conditional_final: [
        { t: "title", text: "FULL CONDITIONAL WAIVER" },
        { t: "para", text: MI_FULL },
        { t: "para", text: "This waiver is conditioned on actual payment of ${amount}. " + MI_RESIDENTIAL },
        { t: "sign", lines: MI_SIGN },
        { t: "notice", text: MI_NOTICE },
      ],
      unconditional_final: [
        { t: "title", text: "FULL UNCONDITIONAL WAIVER" },
        { t: "para", text: MI_FULL },
        { t: "para", text: MI_RESIDENTIAL },
        { t: "sign", lines: MI_SIGN },
        { t: "notice", text: MI_NOTICE },
      ],
    },
  },
  WY: {
    name: "Wyoming",
    cite: "Wyo. Stat. § 29-10-101(b)",
    source: "https://wyoleg.gov/statutes/compress/title29.pdf",
    file: "wy-29-10-101.txt",
    note: "Wyoming prints one lien waiver form for every payment (W.S. 29-10-101(b)), signed before a notary. It waives for payment received to date and reserves retainage and anything still unpaid, so enter those amounts. Sign it in front of the notary; the notary fills the acknowledgment.",
    kindsUseSameForm: true,
    forms: { progress: WY_FORM, final: WY_FORM },
  },
  CA: {
    name: "California",
    cite: "Cal. Civ. Code §§ 8132-8138",
    source: "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=8132",
    file: "ca-8132-8138.txt",
    noticeInline: true,
    note: "California: a waiver and release is null, void and unenforceable unless it is in substantially the statutory form (Civ. Code §§ 8132-8138). A conditional waiver takes effect only when the check clears; give an unconditional waiver only after you have actually been paid.",
    forms: {
      conditional_progress: [
        { t: "title", text: "CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT" },
        { t: "notice", text: CA_COND_NOTICE },
        ...CA_ID(true),
        { t: "title", text: "Conditional Waiver and Release" },
        { t: "para", text: `${CA_PROGRESS_WAIVES} ${CA_CHANGE_ORDERS} ${CA_CHECK_EFFECTIVE}` },
        ...CA_CHECK,
        { t: "title", text: "Exceptions" },
        { t: "para", text: "This document does not affect any of the following:" },
        { t: "para", text: "(1) Retentions." },
        { t: "para", text: "(2) Extras for which the claimant has not received payment." },
        { t: "para", text: "(3) The following progress payments for which the claimant has previously given a conditional waiver and release but has not received payment:" },
        { t: "field", label: "Date(s) of waiver and release:", key: "priorWaiverDates" },
        { t: "field", label: "Amount(s) of unpaid progress payment(s):", key: "priorUnpaid" },
        { t: "para", text: "(4) " + CA_CONTRACT_RIGHTS },
        ...CA_SIGN,
      ],
      unconditional_progress: [
        { t: "title", text: "UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT" },
        { t: "notice", text: CA_UNCOND_NOTICE },
        ...CA_ID(true),
        { t: "title", text: "Unconditional Waiver and Release" },
        { t: "para", text: `${CA_PROGRESS_WAIVES} ${CA_CHANGE_ORDERS} The claimant has received the following progress payment: \${amount}` },
        { t: "title", text: "Exceptions" },
        { t: "para", text: "This document does not affect any of the following:" },
        { t: "para", text: "(1) Retentions." },
        { t: "para", text: "(2) Extras for which the claimant has not received payment." },
        { t: "para", text: "(3) " + CA_CONTRACT_RIGHTS },
        ...CA_SIGN,
      ],
      conditional_final: [
        { t: "title", text: "CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT" },
        { t: "notice", text: CA_COND_NOTICE },
        ...CA_ID(false),
        { t: "title", text: "Conditional Waiver and Release" },
        { t: "para", text: `This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for labor and service provided, and equipment and material delivered, to the customer on this job. ${CA_CHANGE_ORDERS} ${CA_CHECK_EFFECTIVE}` },
        ...CA_CHECK,
        { t: "title", text: "Exceptions" },
        { t: "para", text: "This document does not affect any of the following:" },
        { t: "field", label: "Disputed claims for extras in the amount of:", key: "disputedAmount" },
        ...CA_SIGN,
      ],
      unconditional_final: [
        { t: "title", text: "UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT" },
        { t: "notice", text: CA_UNCOND_NOTICE },
        ...CA_ID(false),
        { t: "title", text: "Unconditional Waiver and Release" },
        { t: "para", text: `This document waives and releases lien, stop payment notice, and payment bond rights the claimant has for all labor and service provided, and equipment and material delivered, to the customer on this job. ${CA_CHANGE_ORDERS} The claimant has been paid in full.` },
        { t: "title", text: "Exceptions" },
        { t: "para", text: "This document does not affect the following:" },
        { t: "field", label: "Disputed claims for extras in the amount of:", key: "disputedAmount" },
        ...CA_SIGN,
      ],
    },
  },
  UT: {
    name: "Utah",
    cite: "Utah Code § 38-1a-802(4)",
    source: "https://le.utah.gov/xcode/Title38/Chapter1A/38-1a-S802.html",
    file: "ut-38-1a-802.txt",
    note: "Utah: a waiver and release is enforceable only if signed and the amount in it is actually received, and only to the extent of a progress payment (Utah Code § 38-1a-802). Utah's statutory forms take effect once the check is endorsed and paid, so the same form serves a conditional or unconditional request.",
    kindsUseSameForm: true,
    forms: {
      progress: [
        { t: "title", text: "UTAH CONDITIONAL WAIVER AND RELEASE UPON PROGRESS PAYMENT" }, ...UT_HEAD(true),
        { t: "para", text: UT_RELEASE },
        { t: "para", text: "This waiver and release applies to a progress payment for the work, materials, equipment, or a combination of work, materials, and equipment furnished by the undersigned to the Property or to the Undersigned's Customer which are the subject of the Invoice or Payment Application, but only to the extent of the Payment Amount. This waiver and release does not apply to any retention withheld; any items, modifications, or changes pending approval; disputed items and claims; or items furnished or invoiced after the Payment Period." },
        { t: "para", text: UT_WARRANT("this progress payment") },
        { t: "sign", lines: UT_SIGN },
      ],
      final: [
        { t: "title", text: "UTAH WAIVER AND RELEASE UPON FINAL PAYMENT" }, ...UT_HEAD(false),
        { t: "para", text: UT_RELEASE },
        { t: "para", text: "This waiver and release applies to the final payment for the work, materials, equipment, or combination of work, materials, and equipment furnished by the undersigned to the Property or to the Undersigned's Customer." },
        { t: "para", text: UT_WARRANT("the final payment") },
        { t: "sign", lines: UT_SIGN },
      ],
    },
  },
  GA: {
    name: "Georgia",
    cite: "O.C.G.A. § 44-14-366(c), (e)",
    source: "https://www.legis.ga.gov/api/legislation/document/20192020/194229",
    file: "ga-44-14-366.txt",
    noticeInline: true,
    minFont: 12,
    kindsUseSameForm: true,
    note: "Georgia: interim and final waivers follow the statutory forms (O.C.G.A. § 44-14-366, as revised effective 2021), in at least 12-point type, with the notice on the form. You are deemed paid and the waiver binds 90 days after the date stated unless you file an affidavit of nonpayment first, so give it only for a payment you expect, and file the affidavit if it doesn't arrive. LienX's text is the 2020 act (SB 315) applied to the statute; the Official Code is published only on LexisNexis.",
    forms: {
      progress: [{ t: "title", text: "WAIVER AND RELEASE OF LIEN AND PAYMENT BOND RIGHTS UPON INTERIM PAYMENT" }, ...SOUTH_HEAD("GEORGIA"), { t: "para", text: SOUTH_INTERIM }, ...GA_TAIL],
      final: [{ t: "title", text: "WAIVER AND RELEASE OF LIEN AND PAYMENT BOND RIGHTS UPON FINAL PAYMENT" }, ...SOUTH_HEAD("GEORGIA"), { t: "para", text: SOUTH_FINAL }, ...GA_TAIL],
    },
  },
  MS: {
    name: "Mississippi",
    cite: "Miss. Code § 85-7-433(1), (2)",
    source: "https://billstatus.ls.state.ms.us/documents/2014/pdf/SB/2600-2699/SB2622SG.pdf",
    file: "ms-85-7-433.txt",
    noticeInline: true,
    // "on the face of the form": the whole form, notice included, fits one page.
    onePage: true,
    kindsUseSameForm: true,
    note: "Mississippi: interim and final waivers follow the statutory forms (Miss. Code § 85-7-433), sworn before a notary, with the notice on the face of the form. You are deemed paid in full 60 days after the date stated unless you file an affidavit of nonpayment or a claim of lien first. LienX's text is the act that created the section (SB 2622, 2014); the Code is published only on LexisNexis.",
    forms: {
      progress: [{ t: "title", text: "INTERIM WAIVER AND RELEASE UPON PAYMENT" }, ...SOUTH_HEAD("MISSISSIPPI"), { t: "para", text: SOUTH_INTERIM }, ...MS_TAIL],
      final: [{ t: "title", text: "WAIVER AND RELEASE UPON FINAL PAYMENT" }, ...SOUTH_HEAD("MISSISSIPPI"), { t: "para", text: SOUTH_FINAL }, ...MS_TAIL],
    },
  },
};

// States whose statutes print waiver forms LienX does not carry yet: a
// generic waiver is refused there.
export const STATUTORY_NOT_CARRIED = {
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
  return String(text).replace(/\{(\w+)(?::([^}]*))?\}/g, (_, k, choices) => {
    const v = values[k];
    if (choices) {
      // A choice blank: mark the chosen option, or leave every option to circle.
      const opts = choices.split("|"), pick = String(v ?? "").trim().toLowerCase();
      return opts.map((o) => (opts.some((x) => x.toLowerCase() === pick) ? (o.toLowerCase() === pick ? `[X] ${o}` : `[ ] ${o}`) : o)).join(" ");
    }
    if (v == null || String(v).trim() === "") return "______________";
    return String(v);
  });
}

export function moneyText(v) {
  const n = Number(String(v ?? "").replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && String(v ?? "").trim() !== "" ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
}
