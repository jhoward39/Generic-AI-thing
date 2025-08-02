# API Documentation

## New API Routes (Voice-to-Tasks Workflow)

### 1. Voice Transcription API
**Endpoint:** `POST /api/transcribe`

Transcribes voice data using OpenAI's Whisper model.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `audio` field containing the audio file

**Response:**
```json
{
  "transcription": "The transcribed text",
  "success": true
}
```

**Example Usage:**
```javascript
const formData = new FormData();
formData.append('audio', audioFile);

const response = await fetch('/api/transcribe', {
  method: 'POST',
  body: formData
});
```

### 2. Task Generation API
**Endpoint:** `POST /api/llm/generate-tasks`

Uses OpenAI's GPT model to extract tasks and dependencies from text.

**Request:**
```json
{
  "text": "Your text input here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "todos": [
      {
        "title": "Task title",
        "duration": 1,
        "dueDate": "2024-01-15",
        "description": "Optional description"
      }
    ],
    "dependencies": [
      {
        "taskId": 1,
        "dependsOnId": 0
      }
    ]
  }
}
```

### 3. Bulk Create API
**Endpoint:** `POST /api/todos/bulk-create`

Creates multiple todos and dependencies at once (for accept/reject workflow).

**Request:**
```json
{
  "todos": [
    {
      "title": "Task 1",
      "duration": 1,
      "dueDate": "2024-01-15"
    },
    {
      "title": "Task 2",
      "duration": 2,
      "dueDate": "2024-01-17"
    }
  ],
  "dependencies": [
    {
      "taskId": 1,
      "dependsOnId": 0
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "createdTodos": [...],
  "createdDependencies": [...],
  "message": "Successfully created 2 todos and 1 dependencies"
}
```

## Existing API Routes (Already Working)

### Todo Management
- **GET** `/api/todos` - Get all todos
- **POST** `/api/todos` - Create a single todo
- **PATCH** `/api/todos/[id]` - Update a todo (title, duration, dueDate, done)
- **DELETE** `/api/todos/[id]` - Delete a todo

### Dependency Management
- **GET** `/api/todos/dependencies` - Get all dependencies and critical path info
- **POST** `/api/todos/dependencies` - Add a dependency
- **DELETE** `/api/todos/dependencies` - Remove a dependency

## Complete Workflow

1. **User Input**: User speaks or types on the frontend
2. **Voice Processing** (if voice): Send to `/api/transcribe` to get text
3. **Task Generation**: Send text to `/api/llm/generate-tasks` to get structured tasks
4. **Frontend Preview**: Show generated tasks/dependencies to user for accept/reject
5. **Bulk Creation**: When user accepts, send to `/api/todos/bulk-create` to create everything at once
6. **Individual Management**: Use existing routes for ongoing todo/dependency management

## Environment Variables Required

Add these to your `.env.local` file:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Key Features

✅ **No duplication** - Reuses existing CRUD endpoints  
✅ **Transaction safety** - Bulk operations use database transactions  
✅ **Consistent with existing patterns** - Uses same data structures and validation  
✅ **Accept/reject workflow** - Perfect for user confirmation before creating tasks  
✅ **Voice and text input** - Supports both input methods  

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
``` 