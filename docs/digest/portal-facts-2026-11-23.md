# Portal facts for the digest, pulled 23 Nov 2026

Source: Supabase project "Lafamilia platform" (hjrtuywqosdxrolhllmy), public schema, read-only queries. No data was changed.

Member in these numbers = account that finished onboarding (users.onboarding_completed_at is set). That is the only "logged in" signal stored in the database; Clerk holds the actual sign-ins. Portal launch is taken as 13 Sep 2026, the first day onboarding.completed events appear.

Team and test accounts excluded everywhere (11 accounts): role ADMIN, any email at lafamiliafoundation.com or vcfamilia.com, any email containing "test" or "+". Three more accounts look like demo personas (first names "Lara" at firm "Acme", "Doers" at "Doers App", and your own Bonda founder account); they are excluded from the connection stories below but left in the member counts, where they move nothing by more than 3. Note: the "test" rule also caught one founder at optimatestlabs.com who may be real. Worst case the member counts are low by 1.

---

## 1. Top 3 lines, ready to paste

### Line 1. Founders raising
WhatsApp: Right now 51 Familia founders are raising inside the portal, about $69M between them. Check your inbox for the invite, or DM me.

LinkedIn: 51 Latino founders are raising inside the LaFamilia Portal right now, about $69M combined. Investors who want to see them can apply at app.lafamiliafoundation.com/apply

Number: 51 onboarded founders with fundraising status "Actively fundraising"; 46 entered a round target; targets add up to $68,750,000; median target $1M. Another 31 plan to raise in the next 6 months. Aggregate only, no names.

### Line 2. Investors open to deals
WhatsApp: 100 investors in the portal have said yes to seeing new deals. Check your inbox for the invite, or DM me.

LinkedIn: 100 of the investors inside the LaFamilia Portal have raised their hand for new deal flow. Founders, the door is at app.lafamiliafoundation.com/apply

Number: 116 onboarded VC members; 100 of them have dealSourcing = true on their investor profile. 66 also offered to mentor, 40 to make intros.

### Line 3. Where the Familia is
WhatsApp: The Familia inside the portal already covers 86 cities in 19 countries. Check your inbox for the invite, or DM me.

LinkedIn: The LaFamilia Portal already has members in 86 cities across 19 countries, from Austin to Asunción. Apply at app.lafamiliafoundation.com/apply

Number: 207 of 252 onboarded members have a geocoded location; distinct cities 86, distinct countries 19. Top countries: US 152, Mexico 21, Argentina 4, Chile 4, Costa Rica 3. (Check that Paraguay members are really in Asunción before using that flourish, or drop it.)

---

## 2. Backup facts for other weeks

1. Two in three founders in the portal already have revenue. 89 of 134 onboarded founders report early, consistent, scaling or break-even revenue (revPhase on founder_profiles). 79 of 134 have a live product with users.
2. Nearly 1 in 4 founders inside is a repeat founder. 31 of 134 onboarded founders carry the auto-assigned "Repeat Founder" badge (member_badges joined to badges).
3. 250+ members have logged in since launch. 233 onboarded between 13 Sep and 23 Nov (118 founders, 108 VCs, 7 angels); 252 all time. 79 in the last 30 days.
4. 400+ founder resources are live in the Grants directory. 407 published grants with operational_status "Live", across 7 regions (LA 67, Boston 58, Chicago 57, SF 57, Seattle 57, CDMX 57, Austin 54), 8 categories (accelerators, banks, law firms, incubators, gov/nonprofit, university programs, community spaces, venture studios). This is a "the portal has" fact, so use it as a secondary line.
5. 27 of the VCs who logged in also angel invest, and 13 are LPs. Angel and LP badges on onboarded VC members.
6. 51 founders have offered help to other founders: 31 warm intros, 27 pitch deck feedback, 21 product feedback, 21 mentorship. (founder_profiles.helpOffers; see data gap 6.)
7. 37 industries represented among onboarded founders; AI 16, B2B fintech 8, digital health 7 lead.
8. Applications are flowing: 106 applications since May; in October alone 24 founders and 7 investors were approved (applications table by month and status).

Weak numbers, do not use yet:
- Perks: 7 live (Stripe x3, RemoFirst, Ramp, AWS Activate, Granola). Only 2 carry a value (AWS $1,000, Granola $5,040), so "combined value" cannot be stated honestly. Only 3 members have viewed or opened a perk since the section launched on 11 Nov. Say instead: "New this month: Stripe, Ramp, RemoFirst, AWS and Granola perks are live" (a feature line, no number).
- Connections: 44 non-team connection requests since launch, sent by 7 people; 4 got a reply; 0 in the last 30 days. Median reply time cannot be stated from 4 replies. Dealflow requests: 4, three of them to your own Bonda profile during testing.
- Membership upgrades: 4 members redeemed the profile reward for a Circle membership since launch (3 Founder Circle, 1 GP Circle). Nice as a story, too small as a number.

---

## 3. Story leads (ask permission first)

1. Founder gets investor replies within days. A founder (first name Gerardo, company Made) finished onboarding on 8 Oct and sent 25 intro requests to VCs that same evening. Two VCs replied and marked the intro started: one at Audaz Capital on 12 Oct (about 4 days), one at MaC Venture Capital on 27 Oct. Ask Gerardo first, then the two VCs. Angle: "He logged in on a Thursday, and by the next week two funds had replied."

2. The fast loop. A founder (Flavia, Fieldpay) onboarded 9 Oct at 04:42, sent an intro request to a VC at Coquí Ventures two minutes later, and had a reply in 11 hours. The same VC then flagged a dealflow interest in another founder (Alvaro, Zing) that afternoon. On 21 Oct a new founder (Christian, Pulse) reached out to Flavia and she replied within one minute. Ask Flavia and the Coquí Ventures member. Angle: "Hear back the same day."

3. Joined, finished profile, became a member in 36 minutes. A founder (Juan, CyberDyme) created his account on 18 Nov at 21:31, finished onboarding at 21:45, earned the profile reward and redeemed it for Founder Circle at 22:07. Ask Juan. Angle: what the profile reward is and why he went for it.

4. Perk in use. A VC (Josh, Alaya Capital) logged in on 16 Nov and within six minutes had opened the Stripe partner program perk. Small, but a real "someone used a perk" moment. Ask Josh.

Permission note: these use first names, companies and fundraising activity, so nothing goes out until each person says yes in writing.

---

## 4. How each number was built

Common CTE used in every query:

```sql
with team as (
  select id from users
  where role = 'ADMIN'
     or lower(email) like '%@lafamiliafoundation.com'
     or lower(email) like '%@vcfamilia.com'
     or lower(email) like '%test%'
     or lower(email) like '%+%'
),
onb as (
  select * from users
  where onboarding_completed_at is not null
    and id not in (select id from team)
)
```

Founders raising (line 1). Table fundraising_profiles joined to founder_profiles and onb. Filter fundStatus = 'Actively fundraising'. Round target is free text ("$1,000,000", "1000000"), so digits were stripped and cast:
```sql
select count(*) founders,
       count(*) filter (where "publishedToDealflow") on_dealflow,
       sum(nullif(regexp_replace(coalesce("roundTarget",''),'[^0-9]','','g'),'')::numeric) sum_target,
       percentile_cont(0.5) within group (order by nullif(regexp_replace(coalesce("roundTarget",''),'[^0-9]','','g'),'')::numeric) median_target
from fundraising_profiles fp
join founder_profiles f on f.id = fp."founderProfileId"
join onb u on u.id = f."userId"
where fp."fundStatus" = 'Actively fundraising';
-- 51 founders, 19 on dealflow, sum 68,750,000, median 1,000,000. Snapshot 23 Nov 2026.
```

Investors open to deals (line 2). investor_profiles joined to onb, role VCS:
```sql
select count(*) n,
       count(*) filter (where "dealSourcing") deal_sourcing,
       count(*) filter (where mentoring) mentoring
from investor_profiles i join onb u on u.id = i."userId";
-- 116, 100, 66. Snapshot 23 Nov 2026.
```
Intros offered: unnest(string_to_array(i."helpOffers", ',')) and count 'Making intros (startups / co-investors / etc.)' = 40.

Cities and countries (line 3). member_locations joined to onb:
```sql
select count(distinct user_id), count(distinct country), count(distinct city)
from member_locations ml join onb u on u.id = ml.user_id;
-- 207 members, 19 countries, 86 cities. Snapshot 23 Nov 2026.
```

Logged in since launch. From onb: count(*) filter (where onboarding_completed_at >= '2026-09-13') = 233; all time 252; last 30 days 79; 16 to 22 Nov 13. Accounts in users total 1,926 (1,915 non-team); most were pre-created from the member list, so "accounts" is not "members who joined".

Revenue and product stage. founder_profiles joined to onb: revPhase in ('Early revenue…','Consistent monthly revenue…','Scaling revenue…','Break-even / Profitable','Break-even/Profitable') = 89 of 134; prodStage = 'Live product with users/customers' = 79.

Repeat founders, angels, LPs. member_badges joined to badges and onb, grouped by badge name: Repeat Founder 31 (all founders), Angel 27 (all VCs), LP 13 (all VCs).

Grants. grants where is_published and operational_status = 'Live' = 407; all created 18 Aug 2026 (bulk import); amount_min and amount_max are null on every row, so no dollar total.

Perks. perks table: 8 rows, 7 status = 'published', 1 draft (duplicate RemoFirst). value_usd set on 2 rows. Engagement from member_events where name like 'perk.%': 3 distinct users with perk.viewed or perk.outbound_opened, 11 to 19 Nov.

Connections. connection_requests joined to users on requester_id and target_id, team excluded: 44 rows, 7 requesters, statuses PENDING 38, STARTED 4, ACCEPTED 2 (both from the Acme/Doers demo pair on 31 Aug). Zero rows with created_at in the last 30 days. contact_events (85 rows) tells the same story. dealflow_requests: 4 rows, all status 'new'.

Applications. applications grouped by kind, status, date_trunc('month', "createdAt"): 106 total since May 2026; Oct 2026 founders 24 approved, 5 rejected; VCs 7 approved, 1 rejected.

---

## 5. Gaps worth closing

1. No login log. The database only knows when someone finished onboarding. "Logged in this week" and "active members" need Clerk's last_sign_in_at synced into users, or a login event in member_events.
2. Intro outcomes are barely captured. connection_requests has STARTED and ACCEPTED, but almost no one updates them, and there is no "met" or "invested" step. A one-tap "did you two talk?" nudge a week after a request would make "X intros led to a meeting" possible.
3. No messaging or meeting data. Members contact each other by email or WhatsApp outside the portal, so replies and meetings are invisible. Even logging "reply sent" from the email link would give a median reply time.
4. Perk claims are not logged. Only views and outbound clicks exist. Add a "I used this" confirmation or partner-side redemption count, and set value_usd on every perk so a combined value is honest.
5. Grants have no amounts. amount_min and amount_max are empty on all 407 rows, so "$X in grants" cannot be said.
6. Data bug: founder_profiles.helpOffers contains strings where "GTM · sales & growth advice" repeats up to 17 times inside one value. Something appends on every save. Worth a fix before using help-offer counts in public.
7. Fundraising amounts are free text with mixed formats ("$1,000,000", "1000000", "$66"). A numeric column would make the $69M line reliable week to week.
8. No test-account flag. Demo personas (Acme, Doers App) sit next to real members. An is_test boolean on users would let every future query exclude them cleanly.
9. Event attendance is not synced. luma_event_attendances has 3 rows; "members who met at an event and then connected in the portal" is not possible yet.
