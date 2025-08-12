-- Test data for jobs table
-- Run this in your database to add some sample jobs for testing

INSERT INTO jobs (title, company, location, description, url, status, posted_date, deadline_date) VALUES 
(
  'Senior Software Engineer',
  'TechCorp Inc',
  'London, UK',
  'We are looking for a Senior Software Engineer to join our dynamic team. You will be responsible for developing high-quality software solutions...',
  'https://techcorp.com/careers/senior-software-engineer',
  'open',
  '2025-08-01',
  '2025-09-01'
),
(
  'Frontend Developer',
  'WebDesign Studio',
  'Manchester, UK',
  'Join our creative team as a Frontend Developer. You will work on exciting web projects using modern technologies like React, TypeScript, and Node.js...',
  'https://webdesign.com/jobs/frontend-developer',
  'open',
  '2025-08-05',
  '2025-09-15'
),
(
  'Full Stack Developer',
  'StartupXYZ',
  'Remote',
  'We are seeking a talented Full Stack Developer to help build our next-generation platform. Experience with React, Node.js, and PostgreSQL required...',
  'https://startupxyz.com/careers/fullstack',
  'open',
  '2025-08-08',
  '2025-08-30'
),
(
  'DevOps Engineer',
  'CloudTech Solutions',
  'Birmingham, UK',
  'Looking for a DevOps Engineer to manage our cloud infrastructure. Experience with AWS, Docker, and Kubernetes is essential...',
  'https://cloudtech.co.uk/jobs/devops',
  'open',
  '2025-08-10',
  '2025-09-10'
);

-- Also insert some sample applications for testing (adjust user_id as needed)
-- You'll need to replace 'your-user-id-here' with an actual user ID from your users table

-- INSERT INTO applications (user_id, job_id, status, application_date, notes) 
-- SELECT 
--   'your-user-id-here', 
--   id, 
--   'draft',
--   NOW(),
--   'Sample application for testing'
-- FROM jobs 
-- WHERE title = 'Senior Software Engineer';
