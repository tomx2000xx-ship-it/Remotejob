# RemotePath UI/UX Completion Map

Updated: 2026-10-06

## Product surface covered

### Public
- Premium homepage / discovery
- Remote job search
- Search results + filtering + sorting
- Job detail
- Company context
- Login
- Sign up
- Responsive mobile navigation
- Footer/newsletter
- Empty search state

### Job seeker workspace
- Dashboard
- Find Jobs
- Saved Jobs
- Applications
- Interviews
- Profile
- Settings
- Responsive workspace navigation
- Application status/table states
- Empty states

### Application experience
- Profile
- Resume
- Questions
- Review
- Submit
- Progress indicator
- Confirmation/notice states

### Interview experience
- Interview workspace
- Question progress
- Answer composer
- Completion state
- Help/support affordance

### Employer experience
- Employer dashboard
- Post a Job
- Candidate management
- Hiring pipeline
- Candidate review

### Admin experience
- Admin overview
- Verification/review surfaces
- Platform health indicators
- Review queues

## Visual system
- Warm ivory editorial background
- Deep charcoal-green primary tone
- Restrained green accent
- Serif display + Inter UI typography
- 10–16px component radii
- Thin neutral borders
- Soft depth instead of heavy shadows
- Clear state communication
- Responsive desktop/tablet/mobile behavior
- Keyboard focus states
- Reduced-motion support

## Asset
The hero visual is committed at:
public/hero-remote.svg

The UI no longer depends on the previous missing remote-reference.png asset.

## Deliberately deferred
This phase is UI/UX only. Authentication, real job data, applications, interviews, employer actions, payments, storage, and database persistence are intentionally not wired to Supabase yet.

## Next phase
1. Functional architecture
2. Supabase schema + RLS
3. Auth and roles
4. Real job/company/application data
5. Storage for resumes/assets
6. Notifications and transactional workflows
7. Production deployment
