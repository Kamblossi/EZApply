# Test Job Tracker Implementation

## Step 4-B: POST /api/jobs - Add Job to Tracker

### Test the new endpoint:

```bash
# Test adding a new job to tracker
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Band 5 Staff Nurse - ICU",
    "company": "NHS Oxford Foundation Trust", 
    "location": "Oxford, UK",
    "url": "https://www.jobs.nhs.uk/xi/vacancy/916123456",
    "description": "We are seeking an experienced Band 5 Staff Nurse to join our ICU team...",
    "status": "draft"
  }'
```

### Expected Response:

```json
{
  "job": {
    "id": "uuid-here",
    "title": "Band 5 Staff Nurse - ICU",
    "company": "NHS Oxford Foundation Trust",
    "location": "Oxford, UK", 
    "url": "https://www.jobs.nhs.uk/xi/vacancy/916123456",
    "description": "We are seeking an experienced Band 5 Staff Nurse to join our ICU team...",
    "status": "open",
    "posted_date": null,
    "deadline_date": null,
    "created_at": "2025-08-01T...",
    "updated_at": "2025-08-01T..."
  },
  "application": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "job_id": "job-uuid", 
    "status": "draft",
    "application_date": null,
    "notes": null,
    "created_at": "2025-08-01T...",
    "updated_at": "2025-08-01T..."
  }
}
```

## Step 4-C: GET /api/jobs/:id - View Job + Timeline

### Test viewing a specific job with application details:

```bash
# Test viewing a specific job with user's application
curl -X GET http://localhost:4000/api/jobs/<job-uuid> \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Expected Response (with application):

```json
{
  "job": {
    "id": "job-uuid",
    "title": "Band 5 Staff Nurse - ICU",
    "company": "NHS Oxford Foundation Trust",
    "location": "Oxford, UK",
    "url": "https://www.jobs.nhs.uk/xi/vacancy/916123456",
    "description": "We are seeking an experienced Band 5 Staff Nurse to join our ICU team...",
    "status": "open",
    "posted_date": null,
    "deadline_date": null,
    "created_at": "2025-08-01T...",
    "updated_at": "2025-08-01T..."
  },
  "application": {
    "id": "application-uuid",
    "user_id": "user-uuid",
    "job_id": "job-uuid",
    "status": "interview",
    "application_date": "2025-07-20T12:34:56Z",
    "notes": "Phone screen completed",
    "created_at": "2025-08-01T...",
    "updated_at": "2025-08-01T..."
  },
  "has_application": true,
  "timeline_summary": {
    "status": "interview",
    "last_updated": "2025-08-01T...",
    "has_notes": true,
    "applied_date": "2025-07-20T12:34:56Z"
  }
}
```

### Expected Response (no application):

```json
{
  "job": {
    "id": "job-uuid",
    "title": "Band 5 Staff Nurse - ICU",
    "company": "NHS Oxford Foundation Trust",
    // ... job details
  },
  "application": null,
  "has_application": false,
  "timeline_summary": null
}
```

### Testing Error Cases:

```bash
# Test invalid UUID format
curl -X GET http://localhost:4000/api/jobs/invalid-id \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: 400 Bad Request

# Test non-existent job
curl -X GET http://localhost:4000/api/jobs/12345678-1234-1234-1234-123456789012 \
  -H "Authorization: Bearer <your_jwt_token>"
# Expected: 404 Not Found
```

## Step 4-D: PATCH /api/jobs/:id/status - Update Job Status

### Test updating job posting status:

```bash
# Test updating a job posting status to closed
curl -X PATCH http://localhost:4000/api/jobs/<job-uuid>/status \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "closed"
  }'
```

### Expected Response:

```json
{
  "message": "Job status updated successfully",
  "job": {
    "id": "job-uuid",
    "title": "Band 5 Staff Nurse - ICU",
    "company": "NHS Oxford Foundation Trust",
    "status": "closed",
    "updated_at": "2025-08-01T..."
  }
}
```

### Test different status values:

```bash
# Archive a job posting
curl -X PATCH http://localhost:4000/api/jobs/<job-uuid>/status \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "archived" }'

# Reopen a job posting
curl -X PATCH http://localhost:4000/api/jobs/<job-uuid>/status \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "open" }'
```

### Testing Error Cases:

```bash
# Test invalid status value
curl -X PATCH http://localhost:4000/api/jobs/<job-uuid>/status \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "invalid" }'
# Expected: 400 Bad Request

# Test invalid UUID format
curl -X PATCH http://localhost:4000/api/jobs/invalid-id/status \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "closed" }'
# Expected: 400 Bad Request

# Test non-existent job
curl -X PATCH http://localhost:4000/api/jobs/12345678-1234-1234-1234-123456789012/status \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "closed" }'
# Expected: 404 Not Found
```

## Step 4-E: Enhanced Timeline Management

### Timeline-Focused Application Updates:

```bash
# Update application status with timeline tracking
curl -X PUT http://localhost:4000/api/applications/<application-uuid> \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "interview",
    "notes": "Phone interview scheduled for Friday at 2pm",
    "event_type": "interview_scheduled"
  }'
```

### Expected Timeline Update Response:

```json
{
  "application": {
    "id": "application-uuid",
    "user_id": "user-uuid",
    "job_id": "job-uuid",
    "status": "interview",
    "notes": "Phone interview scheduled for Friday at 2pm",
    "application_date": "2025-07-20T12:34:56Z",
    "created_at": "2025-08-01T...",
    "updated_at": "2025-08-01T...",
    "job_details": { /* embedded job data */ }
  },
  "timeline_event": {
    "event_type": "interview_scheduled",
    "previous_value": "submitted",
    "new_value": "interview",
    "notes": "Phone interview scheduled for Friday at 2pm",
    "timestamp": "2025-08-01T...",
    "field_changed": "status"
  },
  "message": "Application interview scheduled recorded successfully"
}
```

### Get Application Timeline History:

```bash
# Retrieve complete timeline for an application
curl -X GET http://localhost:4000/api/applications/<application-uuid>/timeline \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Expected Timeline Response:

```json
{
  "application_id": "application-uuid",
  "timeline": [
    {
      "event_type": "application_created",
      "timestamp": "2025-07-15T10:00:00Z",
      "notes": "Application tracking started",
      "status": "draft",
      "field_changed": null
    },
    {
      "event_type": "application_submitted",
      "timestamp": "2025-07-20T12:34:56Z",
      "notes": "Application officially submitted",
      "status": "submitted",
      "field_changed": "application_date"
    },
    {
      "event_type": "status_updated",
      "timestamp": "2025-08-01T14:30:00Z",
      "notes": "Phone interview scheduled for Friday at 2pm",
      "status": "interview",
      "field_changed": "status"
    }
  ],
  "timeline_summary": {
    "total_events": 3,
    "current_status": "interview",
    "first_event": { /* first timeline event */ },
    "latest_event": { /* latest timeline event */ },
    "duration_days": 17
  }
}
```

### Enhanced Job Details with Timeline:

```bash
# Get job with enhanced timeline data
curl -X GET http://localhost:4000/api/jobs/<job-uuid> \
  -H "Authorization: Bearer <your_jwt_token>"
```

### Expected Enhanced Response:

```json
{
  "job": { /* job details */ },
  "application": { /* application details */ },
  "has_application": true,
  "timeline_summary": {
    "current_status": "interview",
    "last_updated": "2025-08-01T...",
    "has_notes": true,
    "applied_date": "2025-07-20T...",
    "total_events": 3,
    "status_progression": [
      { "status": "draft", "date": "2025-07-15T..." },
      { "status": "submitted", "date": "2025-07-20T..." },
      { "status": "interview", "date": "2025-08-01T..." }
    ],
    "next_suggested_action": "Prepare for interview"
  },
  "timeline": [
    { /* chronological timeline events */ }
  ]
}
```

### Different Timeline Event Types:

```bash
# Add a note without changing status
curl -X PUT http://localhost:4000/api/applications/<application-uuid> \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Sent follow-up email to HR",
    "event_type": "follow_up"
  }'

# Schedule interview
curl -X PUT http://localhost:4000/api/applications/<application-uuid> \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "interview",
    "notes": "Video interview scheduled for Monday 10am",
    "event_type": "interview_scheduled",
    "application_date": "2025-08-05T10:00:00Z"
  }'
```

### Testing Duplicate Prevention:

```bash
# Try adding the same job URL again - should return 409 with existing data
curl -X POST http://localhost:4000/api/jobs \
  -H "Authorization: Bearer <your_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Band 5 Staff Nurse - ICU",
    "company": "NHS Oxford Foundation Trust",
    "url": "https://www.jobs.nhs.uk/xi/vacancy/916123456"
  }'
```

### Features Implemented:

✅ **Step 4-B: POST /api/jobs**
- Job Deduplication by URL
- Shared Job Model with User Applications
- Duplicate Application Prevention
- Transaction Safety

✅ **Step 4-C: GET /api/jobs/:id**
- View Specific Job Details
- User Application Context
- Timeline Summary Preparation
- UUID Validation
- Comprehensive Error Handling

✅ **Step 4-D: PATCH /api/jobs/:id/status**
- Update Job Posting Status (open/closed/archived)
- Global Job Management
- Admin/System Operations Support
- Status Lifecycle Management
- Crawler/Sync Integration Ready

✅ **Step 4-E: Enhanced Timeline Management**
- Timeline-Focused Application Updates
- Event Type Tracking (status_change, note_added, interview_scheduled, follow_up)
- Timeline History Retrieval
- Enhanced Job Details with Timeline Context
- Status Progression Tracking
- Suggested Next Actions
- Duration Calculations

### Timeline Event Types Supported:

- **status_change**: Application status updates
- **note_added**: Adding notes without status change
- **interview_scheduled**: Interview scheduling
- **follow_up**: Follow-up communications
- **other**: Custom events

### Enhanced API Capabilities:

**Timeline-Aware Updates:**
- `PUT /api/applications/:id` with `event_type` field
- Automatic timeline event generation
- Previous/new value tracking
- Contextual response messages

**Timeline History:**
- `GET /api/applications/:id/timeline` for complete event history
- Chronological event sorting
- Timeline summary statistics
- Duration tracking

**Enhanced Job Context:**
- `GET /api/jobs/:id` includes full timeline data
- Status progression visualization
- Next action suggestions
- Event count summaries

### Job Status Management:

**Two-Level Status System:**
- **Job Status** (`jobs.status`): `open`, `closed`, `archived` - Controls job posting visibility/lifecycle
- **Application Status** (`applications.status`): `draft`, `submitted`, `interview`, `rejected`, `accepted` - Tracks user progress

**Use Cases:**
- **Expire Listings**: Mark jobs as `closed` when deadline passes
- **Archive Management**: Move old jobs to `archived` status
- **Bulk Operations**: Crawler can sync job status from external sources
- **Admin Control**: Moderate job postings by updating status

### API Benefits:

✅ **Frontend Integration Ready**: Complete data for job detail pages
✅ **Timeline Foundation**: Rich timeline UI component support
✅ **User Context**: Clear separation of public vs private data
✅ **Error Handling**: Comprehensive validation and error responses
✅ **Performance**: Efficient single-query job+application lookup
✅ **Status Management**: Clean separation of job vs application lifecycle
✅ **Admin Operations**: Ready for moderation and bulk management workflows
✅ **Timeline Tracking**: Complete application journey visibility
✅ **Event History**: Audit trail for all application changes
✅ **Progress Insights**: Duration tracking and next action suggestions
