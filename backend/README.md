# Backend (LangGraph + NVIDIA NIM + Canvas Integration)

AI-powered learning platform that helps anyone think critically through complex problems using Socratic questioning. Integrated with Canvas LMS for personalized assignment help using course materials as RAG context.

## 🚀 Features

- **Socratic Learning**: Uses first principles thinking and questioning to help students understand deeply
- **Canvas Integration**: Direct access to your Canvas courses, assignments, and materials
- **RAG-Powered Assistance**: Uses course materials as context for relevant, grounded help
- **Multiple Learning Modes**: Question/answer, study sessions, assignment help, material generation
- **NVIDIA NIM**: Powered by NVIDIA's Llama 3.3 Nemotron model for high-quality responses

## 📋 Prerequisites

1. **NVIDIA API Key**: Get one from [NVIDIA AI](https://build.nvidia.com/)
2. **Canvas API Token**: Get from your Canvas account:
   - Log into Canvas
   - Go to Account → Settings
   - Scroll to "Approved Integrations"
   - Click "+ New Access Token"
   - Copy the generated token

## 🛠️ Setup

```bash
# 1. Install dependencies
npm run install:deps

# 2. Configure environment
cp .env.example .env

# 3. Edit .env and add your keys:
# - NV_API_KEY: Your NVIDIA API key
# - CANVAS_API_TOKEN: Your Canvas API token
# - CANVAS_API_URL: Your Canvas instance URL (if different from default)
```

## 💻 Usage

### API Server Mode (Recommended - For Frontend Integration)
Run as REST API server for frontend applications:

```bash
# Start API server with auto-reload
npm run dev

# Or for production
npm start
```

Server runs on **http://localhost:3001** with these endpoints:
- `POST /api/chat` - Chat with AI
- `GET /api/assignments` - Get Canvas assignments  
- `POST /api/canvas/connect` - Connect to Canvas
- Full API docs: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

### CLI Mode (For Testing)
Test the LLM directly from command line:

```bash
# Interactive Canvas mode - shows your upcoming assignments
npm run canvas

# Or directly:
node src/main.js --mode=canvas --msg="Show me what assignments I have coming up"
```

**Example Canvas Workflow:**
1. System lists your upcoming assignments and exams
2. You select which one you need help with
3. Tutor pulls relevant course materials
4. Tutor asks Socratic questions based on those materials
5. You think critically through the subject matter

### Other Modes

```bash
# Question/Dialogue mode (default)
node src/main.js --mode=question --msg="What is entropy and why does it increase?"

# Study mode (active recall, spaced retrieval)
node src/main.js --mode=study --msg="Help me prepare for my thermodynamics exam"

# Start/Create mode (writing assignments)
node src/main.js --mode=start --msg="Start my essay: 'Impacts of GPUs on modern AI'"

# Material generation mode
node src/main.js --mode=material --msg="Make flashcards for eigenvectors, intermediate level"
```

## 🎯 How It Works

### Canvas Integration Flow

1. **Connect to Canvas**: Uses your API token to access your courses and assignments
2. **List Upcoming Work**: Shows assignments, quizzes, and exams with due dates
3. **Pull Course Materials**: Retrieves syllabus, modules, pages, and files for context
4. **RAG-Enhanced Help**: Uses course materials to provide relevant, grounded assistance
5. **Socratic Guidance**: Asks questions to help you think critically, never gives direct answers

### Available Canvas Tools

- `list_upcoming_assignments`: View all upcoming work across your courses
- `get_course_materials`: Pull course content for context (syllabus, modules, pages)
- `get_assignment_details`: Get specifics about an assignment/exam
- `get_page_content`: Read specific course pages/materials

## 🔧 Configuration

### Environment Variables

```bash
# NVIDIA Configuration
NV_API_KEY=your_nvidia_api_key_here
NV_MODEL=nvidia/llama-3.3-nemotron-super-49b-v1.5  # Default model

# Canvas Configuration
CANVAS_API_TOKEN=your_canvas_api_token_here
CANVAS_API_URL=https://canvas.instructure.com/api/v1  # Or your institution's URL
```

### Custom Canvas Instance

If your school uses a custom Canvas domain (e.g., `canvas.university.edu`), update `CANVAS_API_URL`:

```bash
CANVAS_API_URL=https://canvas.university.edu/api/v1
```

## 🏗️ Architecture

- **LangGraph**: Manages agent workflow and tool calling
- **NVIDIA NIM**: Powers the LLM with Llama 3.3 Nemotron
- **Canvas API**: Direct REST API integration (via MCP pattern)
- **Socratic System Prompt**: Guides the AI to ask questions, not give answers

## 🎓 Learning Philosophy

A★ Tutor follows cognitive science principles:

- **Active Recall**: Helps you retrieve information from memory
- **Elaboration**: Connects new knowledge to what you already know
- **Interleaving**: Mixes different topics for deeper learning
- **Spaced Retrieval**: Reviews material at optimal intervals
- **Metacognition**: Helps you think about your thinking

## 🤝 Contributing

This project is part of the A-Star student productivity platform. Future features:
- Multi-turn conversation memory
- More sophisticated RAG with vector embeddings
- Study plan generation based on Canvas calendar
- Collaborative study groups

## 📝 Notes

- First run will check Canvas connection and show available courses
- All Canvas data stays local - no data is sent to third parties
- The AI tutor never gives direct answers - it guides you to discover them yourself
- Works best when you engage with the questions and think critically

## 🐛 Troubleshooting

**Canvas connection fails:**
- Verify your `CANVAS_API_TOKEN` is correct
- Check your `CANVAS_API_URL` matches your institution
- Ensure your token has the necessary permissions

**No upcoming assignments showing:**
- Make sure you're enrolled in active courses
- Check that assignments have due dates set in Canvas

**LLM errors:**
- Verify your `NV_API_KEY` is valid
- Check your NVIDIA API quota/rate limits

