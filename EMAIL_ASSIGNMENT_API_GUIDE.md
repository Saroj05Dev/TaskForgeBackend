# Email-Based Task Assignment - API Guide

## ✨ Feature Overview

Tasks can now be assigned using the assignee's email address instead of user ID. The backend automatically looks up the user and validates the email.

---

## 🔧 How It Works

1. Frontend sends `assigneeEmail` in request body
2. Backend looks up user by email (case-insensitive)
3. If user found → assigns task to that user
4. If user not found → returns 400 error with clear message
5. Empty email → unassigns task (sets to null)

---

## 📡 API Endpoints

### Create Task with Email Assignment

**Endpoint:** `POST /tasks`

**Authorization:** Bearer token required

**Request Body:**

```json
{
  "title": "Fix authentication bug",
  "description": "Users can't login with Google",
  "priority": "High",
  "status": "Todo",
  "assigneeEmail": "john.doe@example.com"
}
```

**Response (200 - Success):**

```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Fix authentication bug",
    "description": "Users can't login with Google",
    "priority": "High",
    "status": "Todo",
    "createdBy": {
      "_id": "507f1f77bcf86cd799439014",
      "fullName": "Jane Smith",
      "email": "jane@example.com"
    },
    "assignedUser": {
      "_id": "507f1f77bcf86cd799439015",
      "fullName": "John Doe",
      "email": "john.doe@example.com"
    },
    "sharedWith": [],
    "createdAt": "2026-01-06T06:00:00.000Z",
    "updatedAt": "2026-01-06T06:00:00.000Z"
  },
  "error": {}
}
```

**Response (400 - User Not Found):**

```json
{
  "success": false,
  "message": "No user found with email: invalid@example.com",
  "data": {},
  "error": "No user found with email: invalid@example.com"
}
```

---

### Update Task Assignment

**Endpoint:** `PUT /tasks/:id`

**Authorization:** Bearer token required

**Request Body (Assign to User):**

```json
{
  "assigneeEmail": "alice@example.com"
}
```

**Request Body (Unassign Task):**

```json
{
  "assigneeEmail": ""
}
```

**Response (200 - Success):**

```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "title": "Fix authentication bug",
    "assignedUser": {
      "_id": "507f1f77bcf86cd799439016",
      "fullName": "Alice Johnson",
      "email": "alice@example.com"
    },
    "updatedAt": "2026-01-06T06:30:00.000Z"
  },
  "error": {}
}
```

**Response (400 - User Not Found):**

```json
{
  "success": false,
  "message": "No user found with email: nonexistent@example.com",
  "data": {},
  "error": "No user found with email: nonexistent@example.com"
}
```

---

## 🔄 Backward Compatibility

**Still Supported:** Assigning by user ID

```json
{
  "title": "New task",
  "assignedUser": "507f1f77bcf86cd799439015"
}
```

**Priority:** If both `assigneeEmail` and `assignedUser` are provided, `assigneeEmail` takes precedence.

---

## 📊 Field Comparison

| Field           | Type     | Description                   | Example                      |
| --------------- | -------- | ----------------------------- | ---------------------------- |
| `assigneeEmail` | String   | Email of user to assign (NEW) | `"john@example.com"`         |
| `assignedUser`  | ObjectId | User ID (OLD - still works)   | `"507f1f77bcf86cd799439015"` |

---

## ✅ Validation Rules

1. **Email Format:** No validation - any string accepted
2. **Case Insensitive:** `John@Example.COM` → `john@example.com`
3. **Whitespace:** Trimmed automatically
4. **Empty String:** Unassigns task (sets to null)
5. **User Lookup:** Must exist in database

---

## 🧪 Testing Scenarios

### Scenario 1: Assign Task to Valid User

**Request:**

```bash
POST /tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "title": "Review PR",
  "description": "Check code quality",
  "priority": "Medium",
  "status": "Todo",
  "assigneeEmail": "reviewer@company.com"
}
```

**Expected:** ✅ Task created and assigned to user with that email

---

### Scenario 2: Invalid Email

**Request:**

```bash
POST /tasks
Content-Type: application/json

{
  "title": "New task",
  "assigneeEmail": "doesnotexist@example.com"
}
```

**Expected:** ❌ 400 Error - "No user found with email: doesnotexist@example.com"

---

### Scenario 3: Unassign Task

**Request:**

```bash
PUT /tasks/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "assigneeEmail": ""
}
```

**Expected:** ✅ Task updated with `assignedUser: null`

---

### Scenario 4: Case Insensitive Lookup

**Request:**

```bash
POST /tasks
Content-Type: application/json

{
  "title": "Test task",
  "assigneeEmail": "JOHN@EXAMPLE.COM"
}
```

**Expected:** ✅ Finds user with email "john@example.com" (lowercase)

---

### Scenario 5: Update Assignment

**Request:**

```bash
PUT /tasks/507f1f77bcf86cd799439011
Content-Type: application/json

{
  "assigneeEmail": "newassignee@example.com"
}
```

**Expected:** ✅ Task reassigned to new user

---

## 🎯 Frontend Integration

### Create Task Form

```javascript
const handleSubmit = async (formData) => {
  const response = await fetch("/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      assigneeEmail: formData.assigneeEmail, // User enters email
    }),
  });

  const result = await response.json();

  if (!result.success) {
    // Show error: "No user found with email: ..."
    showError(result.message);
  } else {
    // Task created successfully
    showSuccess("Task assigned to " + result.data.assignedUser.fullName);
  }
};
```

### Update Assignment

```javascript
const reassignTask = async (taskId, newEmail) => {
  const response = await fetch(`/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assigneeEmail: newEmail,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    showError(result.message);
  } else {
    showSuccess("Task reassigned successfully");
  }
};
```

### Unassign Task

```javascript
const unassignTask = async (taskId) => {
  await fetch(`/tasks/${taskId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      assigneeEmail: "", // Empty string unassigns
    }),
  });
};
```

---

## 🔐 Security Notes

1. **Email Validation:** Backend validates user exists
2. **Case Insensitive:** Prevents duplicate lookups
3. **Trimming:** Removes accidental whitespace
4. **Error Messages:** Don't expose sensitive user data
5. **Authorization:** Still requires valid auth token

---

## ⚠️ Breaking Changes

**None!** This is backward compatible:

- Old requests with `assignedUser` ID still work
- New requests can use `assigneeEmail`
- Both fields can coexist (email takes priority)

---

## 📝 Implementation Details

### Backend Logic

```javascript
// In TaskService.createTask()
if (task.assigneeEmail && task.assigneeEmail.trim() !== "") {
  const user = await userRepository.findUser({
    email: task.assigneeEmail.toLowerCase().trim(),
  });

  if (!user) {
    throw new AppError(`No user found with email: ${task.assigneeEmail}`, 400);
  }

  assignedUser = user._id;
}
```

### Email Normalization

- Converted to lowercase
- Whitespace trimmed
- Empty string treated as null

---

## 🚀 Benefits

1. **User-Friendly:** Users enter emails instead of IDs
2. **Validation:** Immediate feedback if user doesn't exist
3. **Flexible:** Supports both email and ID
4. **Secure:** Validates user exists before assignment
5. **Clear Errors:** Descriptive error messages

---

## 📞 Support

**Common Issues:**

| Issue                  | Solution                        |
| ---------------------- | ------------------------------- |
| "User not found" error | Check email spelling and case   |
| Task not assigned      | Verify user exists in database  |
| Empty assignedUser     | Check if email was empty string |

**Example Error Handling:**

```javascript
try {
  await createTask({ assigneeEmail: email });
} catch (error) {
  if (error.message.includes("No user found")) {
    alert(
      "User with that email does not exist. Please check the email address."
    );
  }
}
```
