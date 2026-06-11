-- Policies: deny-with-reason support + seeded Capital Core policy content.
-- Idempotent. Safe to re-run (re-seeds bodies via ON CONFLICT on slug).

-- 1. Catalog columns: stable slug + grouping ------------------------------
alter table policies add column if not exists slug text;
alter table policies add column if not exists category text;
alter table policies add column if not exists sort_order integer not null default 0;
-- Standard unique index (Postgres treats NULL slugs as distinct), so the
-- seed's ON CONFLICT (slug) can infer this index.
create unique index if not exists policies_slug_key on policies (slug);

-- 2. Responses: a family can accept OR deny (with a reason) ---------------
alter table policy_acceptances
  add column if not exists status text not null default 'accepted';
alter table policy_acceptances
  add column if not exists denial_reason text;
do $$ begin
  alter table policy_acceptances
    add constraint policy_acceptances_status_check check (status in ('accepted','denied'));
exception when duplicate_object then null; end $$;

-- Same for the student-level acceptance table (created in a later module).
do $$ begin
  if to_regclass('public.student_policy_acceptances') is not null then
    alter table student_policy_acceptances add column if not exists status text not null default 'accepted';
    alter table student_policy_acceptances add column if not exists denial_reason text;
    begin
      alter table student_policy_acceptances
        add constraint student_policy_acceptances_status_check check (status in ('accepted','denied'));
    exception when duplicate_object then null; end;
  end if;
end $$;

-- 3. Seed the six consolidated policies ----------------------------------
insert into policies (slug, name, category, sort_order, required, active, version, body) values
('refund_cancellation', 'Refund & Cancellation Policy', 'Financial', 1, true, true, 1,
$pol$At Capital Core Dance Studio, we strive to provide the best experience for our students and their families. To ensure clarity and fairness for both our studio and our clients, we have outlined the following refund and cancellation policy.

1. CLASS REGISTRATION AND PAYMENT
Class Enrollment: Payment is required at the time of registration for all dance classes. Registration is considered confirmed once payment is processed.
Refunds: All class fees are non-refundable unless otherwise specified in this policy.

2. CANCELLATION POLICY FOR CLASSES
Cancellations by the Studio: If a class is canceled by the studio due to unforeseen circumstances (e.g., weather, instructor illness, etc.), a makeup class or credit will be offered. If a class cannot be rescheduled, a credit for the missed class will be provided.
Cancellations by the Student:
- Before the Start of the Class Session: If a student wishes to cancel their registration for a session before it begins, they must notify the studio at least 7 days prior to the first class. In this case, a full refund or studio credit will be issued, minus a $20 processing fee.
- After the Start of the Class Session: Refunds will not be issued once a class session has started, but a studio credit may be provided for any remaining classes if cancellation is requested within the first two weeks of the session.
- Missed Classes: No refunds or credits will be issued for missed classes. However, the studio may offer makeup classes at its discretion based on availability.

3. WORKSHOP, CAMP, AND INTENSIVE CANCELLATION POLICY
Before the Event:
- A full refund (minus a $65 administrative fee) will be issued if the cancellation is made at least 14 days before the start of the workshop, camp, or intensive.
- Cancellations made between 7 to 14 days before the event will be refunded 50% of the fee.
- No refunds will be provided for cancellations made less than 7 days before the event start date.
After the Event Begins: No refunds or credits will be issued for cancellations after the start of a workshop, camp, or intensive.

4. PRIVATE LESSONS CANCELLATION POLICY
Cancellation by the Student: Private lessons must be canceled at least 24 hours in advance to avoid a cancellation fee. Lessons canceled with less than 24 hours' notice will incur a 50% cancellation fee, and no-shows will be charged the full price of the lesson.
Cancellation by the Instructor: If the instructor needs to cancel a private lesson, the studio will offer a makeup lesson or a full refund for the missed lesson.

5. REFUNDS FOR MERCHANDISE
Defective Products: If any product purchased from the retail store is defective, a full refund or exchange will be provided.
Non-Defective Products: Due to hygiene and sizing concerns, merchandise returns are not accepted unless the item is unused, unwashed, and in its original packaging. All returns must be made within 7 days of purchase with proof of purchase.
Studio Credit: If an item is returned within the specified period, a store credit will be issued in lieu of a cash refund. No refunds or credits will be given for clearance items — all sales are final.

6. SPECIAL CIRCUMSTANCES
Medical or Injury Refunds: In the event of a medical issue or injury that prevents a student from continuing their classes, a partial refund or credit may be issued upon receipt of a doctor's note. The amount of the refund or credit will be based on the number of classes remaining in the session.
Family Emergencies: We understand that family emergencies arise, and in such cases, we will work with families to offer a refund or credit on a case-by-case basis.

7. PAYMENT PLANS AND AUTO-RENEWALS
Payment Plans: If a student is on a payment plan, payments must be made on time to avoid service disruption. If a payment is missed, the student will be given a 5-day grace period before the class is at risk of being removed from the schedule. There will be no refunds for payments made.
Auto-Renewals: Students enrolled in recurring classes or memberships will have their sessions automatically renewed at the beginning of each month unless they cancel their enrollment at least 30 days in writing before the next billing cycle. Refunds will not be given for auto-renewed memberships. Cancellations must be submitted before the 15th of the month to avoid charges for the following month. (Example: If you cancel your membership on May 18th, you will be billed for June, and your membership will be canceled for July.)

8. POLICY AMENDMENTS
Capital Core Dance Studio reserves the right to update or amend this refund and cancellation policy at any time. All changes will be communicated to students and families via email or through studio announcements.

By registering for classes or events at Capital Core Dance Studio, students and families agree to the terms outlined in this refund and cancellation policy.$pol$),

('payment_billing_authorization', 'Payment & Billing Authorization', 'Financial', 2, true, true, 1,
$pol$PAYMENT AUTHORIZATION
I represent and warrant that if I am purchasing something or paying for a service from this facility or from other merchants through this facility that (i) any credit card or bank account draft (ACH Draft) information I supply is true and complete, (ii) charges incurred by me will be honored by my credit card company or financial institution, and (iii) I will pay the charges incurred by me at the posted prices, including any applicable taxes, fees, and penalties.

I hereby authorize (if online payment is made or autopay information is provided) this facility to charge my ACH draft, or credit card account. I understand that a 30 day written notice is required to terminate billing and I am responsible for payment whether or not my student attends classes until I notify this facility in writing to drop my student from class(es).

Should I dispute a charge through my financial institution this will constitute a breach of contract possibly resulting in, but not limited to, penalties, additional fees, collection, legal action, and/or termination of any and/or all current and future services.

AUTHORIZATION TO CHARGE
By providing my credit card, debit card, or bank account information, I authorize Capital Core Dance Studio to charge my account for the agreed upon purchases and/or services.

If Capital Core Dance Studio is unable to secure funds from my credit/debit card(s) or my bank for any reason, including, but not limited to, insufficient funds in my credit/debit card or bank account or insufficient or inaccurate information provided by me when submitting my electronic payment, Capital Core Dance Studio may undertake further collection action.

RECURRING PAYMENT AUTHORIZATION
By providing your debit card, credit card, or bank account information and opting in to recurring payments, you certify that you have the authority to authorize debits or charges to the payment information identified here and you authorize Capital Core Dance Studio to electronically debit or charge the payment information on a recurring basis in the amount due on or after the due date for your payment.

Your authorization will remain in effect until you notify us that you wish to revoke this authorization and we have a reasonable opportunity to act on your notice. You may opt out of recurring billing by accessing your account online at capitalcoredance.com or on your device by using the iClassPro app. You may print this authorization or store it electronically and keep it for your records.$pol$),

('liability_waiver', 'Liability Waiver & Release', 'Waivers', 3, true, true, 1,
$pol$By registering my child(ren) with Capital Core Dance Studio, I agree to participate (or allow my child(ren) and family members to participate) in Capital Core Dance Studio, and hereby release Capital Core Dance Studio, its directors, officers, agents, coaches, and employees from liability for any injury that might occur to myself (or to my child(ren) and family members) while participating in the Capital Core Dance Studio program, including travel to and from training sessions, performances, or other scheduled organization activities.

I agree to indemnify and hold harmless the above-mentioned organizations and/or individuals, their agents and/or employees, against any and all liability for personal injury, including injuries resulting in death to me, my child(ren), and/or other family members, or damage to my property, the property of my child(ren) and/or other family members, or both, while I (or my child(ren) or family members) participate in the Capital Core Dance Studio program and other classes.

ACKNOWLEDGMENT OF RISK
By signing this waiver, the undersigned acknowledges and understands that participating in dance, gymnastics, acrobatics, and related physical activities involves inherent risks, including but not limited to: physical injury (e.g., sprains, strains, fractures, bruising); emotional stress from performing or physical exertion; equipment-related injuries (e.g., mats, bars, or other apparatus); accidental falls, collisions, or other accidents. While Capital Core Dance Studio takes all reasonable precautions to ensure a safe environment, the nature of physical activities means that there is always a risk of injury, regardless of the skill level or experience of the participant.

ASSUMPTION OF RESPONSIBILITY
The undersigned voluntarily accepts and assumes all risks associated with participating in dance, acro, gymnastics, and related activities. The participant agrees to take personal responsibility for their own safety and well-being during all activities conducted at Capital Core Dance Studio. This includes adhering to all instructions from instructors and staff, using the studio's equipment safely, and following the studio's policies and guidelines.

RELEASE OF LIABILITY
The undersigned, for themselves and their heirs, executors, administrators, and assigns, hereby release, discharge, and hold harmless Capital Core Dance Studio, its employees, instructors, agents, and affiliates from any liability or claims for injuries, damages, or losses arising out of or in connection with participation in any activity, class, event, or use of the studio's facilities.

INDEMNIFICATION
The undersigned agrees to indemnify and hold harmless Capital Core Dance Studio and its affiliates, instructors, employees, and agents from any claims, demands, or damages arising out of the undersigned's or participant's negligence, misconduct, or failure to follow safety procedures.

AGREEMENT TO POLICIES AND PROCEDURES
The undersigned agrees to abide by all studio policies and procedures as outlined by Capital Core Dance Studio, including safety rules, code of conduct, and any other regulations designed to ensure a safe and positive environment for all participants.

GOVERNING LAW
This waiver shall be governed by and construed in accordance with the laws of the state(s) in which Capital Core Dance Studio operates. Any disputes arising out of this waiver shall be resolved within the jurisdiction of the relevant local court.

COVENANT NOT TO SUE
As legal guardian of my designated student(s), I hereby consent to all student(s) participating in this facility's program(s). I recognize that potentially severe injuries can occur in any activity involving height or motion, including tumbling and related activities including cheerleading, tumble tramp, trampoline, stunting, pyramids, dance, swimming, martial arts, gymnastics and physical activity in general. I understand that it is the express intent of all staff and personnel to provide for the safety and protection of my student(s) and, in consideration for allowing my student(s) to use these facilities, I hereby COVENANT NOT TO SUE and FOREVER RELEASE this facility, affiliated and partner companies and organizations, property owners and lessors, staff, contractors, subcontractors, teachers, coaches, owners, directors and other members involved in this facility's program(s), from all liability and for any and all damages and injuries suffered by my student(s) during instruction, supervision, and/or control during any and all classes or extra activities.$pol$),

('student_enrollment', 'Student Enrollment Policies', 'Enrollment', 4, true, true, 1,
$pol$By enrolling in classes at Capital Core Dance Studio, I acknowledge and agree to abide by the following policies:

ANNIVERSARY FEE
All students are required to pay an annual anniversary fee. This fee is valid for one year from the date of payment or until the student officially withdraws from the program.

MAKEUP POLICY
Due to our strict student-to-teacher ratio, missed classes will not result in make-up classes, prorated tuition, or refunds. This includes absences due to illness, personal conflict, vacations, or scheduled holidays. No refunds will be issued for missed classes.

DROP PROCEDURE
Parents/guardians must notify Capital Core Dance Studio in writing to officially drop a student from class. Written notice may be provided via email, postal mail, or hand-delivered to the front desk. Verbal notice from the student will not be accepted. Tuition will continue to be charged until written notice is received. If a student discontinues attendance without providing written notice, the account will be charged for an additional 30 days to hold the student's spot in class, which could have otherwise been offered to a student on the waiting list.

DRESS CODE
- Students may wear tucked-in t-shirts and shorts or leotards (for girls).
- No chewing gum or dangling jewelry during class.
- Hair must be secured away from the face.
- Large hair bows or ornaments should be avoided.
- Proper dance footwear is required.
- All personal items must be labeled. Capital Core Dance Studio is not responsible for lost or stolen items.

ARRIVAL AND PICKUP
- Students should arrive no more than 5 minutes before class begins.
- Parents/guardians must pick up students promptly after class.
- Students must wait inside the building for pickup and should not run to and from vehicles.
- Parents should drive slowly and cautiously in the parking lot, especially during peak times.

By accepting, I acknowledge that I have read, understand, and agree to the above policies, terms, and conditions.$pol$),

('medical_authorization', 'Medical Authorization & Acknowledgment of Risk', 'Waivers', 5, true, true, 1,
$pol$I certify that I am the parent or legal guardian for my child(ren) and myself (if dancer is signee). I hereby give my permission for any supervisor, coach, or other team administrator associated with Capital Core Dance Studio to seek and give appropriate medical attention for my child(ren) in the event of an accident, injury, or illness. I will be responsible for any and all costs associated with any necessary medical attention and/or treatment.

I hereby waive, release, and forever discharge Capital Core Dance Studio from all rights and claims for damages, injury, or loss to person or property that may be sustained or occur during participation in Capital Core Dance Studio activities, whether or not damages or loss is due to negligence. I hereby acknowledge that my child(ren) is (are) physically fit and capable of participation in all activities.

ASSUMPTION OF RISK
I understand that dance is a physical activity that can result in injury, including, but not limited to, falls, strains, sprains, or other injuries. I agree to assume full responsibility for any risks of injury or accidents that may occur during participation in classes, rehearsals, or performances.

MEDICAL CLEARANCE
I affirm that the student listed above is physically fit to participate in the activities at Capital Core Dance Studio. If the student has any medical conditions or concerns, I have provided accurate and up-to-date medical information to the studio. I understand that it is my responsibility to notify the studio if the student has any medical issues that may affect participation in dance-related activities.

EMERGENCY MEDICAL TREATMENT
In the event of a medical emergency, I authorize Capital Core Dance Studio to seek emergency medical treatment for the student if necessary. I agree to be responsible for any medical expenses incurred as a result of such treatment.

WAIVER OF LIABILITY
I hereby release, waive, and hold harmless Capital Core Dance Studio, its instructors, employees, and affiliates, from any and all claims, demands, or causes of action arising from injury, illness, or death that may occur during or after participation in any activities at the studio. This includes any claims for negligence or other causes of action related to participation in dance-related activities.

INDEMNIFICATION
I agree to indemnify and hold harmless Capital Core Dance Studio, its owners, instructors, and staff from any and all claims, damages, costs, or expenses, including legal fees, arising from any injury or accident caused by or during participation in any dance-related activities.$pol$),

('photo_video_release', 'Photo / Video Release Authorization', 'Optional', 6, false, true, 1,
$pol$By accepting, I give permission for Capital Core Dance Studio to photograph or video record myself or my child during classes, events, and performances. I understand that these images may be used for promotional, marketing, social media, advertising, or educational purposes by Capital Core Dance Studio without compensation.

I acknowledge that all photos and videos taken remain the property of Capital Core Dance Studio. I understand that if I wish to revoke this permission, I must submit a written request to the studio.

By accepting, I certify that I am the legal parent/guardian (or participant if over 18) and authorize this release.

This release is OPTIONAL. If you do not wish to grant permission, you may deny this policy and provide a brief note; your dancer's participation is unaffected.$pol$)

on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  sort_order = excluded.sort_order,
  required = excluded.required,
  body = excluded.body,
  updated_at = now();
