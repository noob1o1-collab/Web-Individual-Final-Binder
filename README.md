# Space Binder

Space Binder is a full-stack, interactive workspace designed to keep users connected with the people who matter most. Built with Node.js and PostgreSQL, it functions as a dynamic shared portal where connected users can maintain personal and shared diaries, upload photos to a collaborative gallery, track relationship milestones, and interact via integrated features.

## Setup and Run Instructions

### Prerequisites
- Node.js installed
- PostgreSQL installed and running

### Installation Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/noob1o1-collab/Web-Individual-Final-Binder.git
   cd Web-Individual-Final-Binder
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Environment Variables
Create a `.env` file in the root directory and configure your PostgreSQL database credentials and session secrets:

```env
PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=space_binder_db
DB_PORT=5432
SESSION_SECRET=your_super_secret_key
```

### Starting the Server and Client
1. Set up your database using the provided schema (see the Database Schema section).
2. Start the development server:
   ```bash
   npm run dev
   ```
3. The application will be live at `http://localhost:5000`. The client is served statically via the backend.

## Technology Stack
- **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Custom Responsive Grid/Flexbox UI)
- **Backend:** Node.js, Express.js (MVC Architecture)
- **Database:** PostgreSQL (Relational data for users, connections, diaries, and photos)
- **Security & Auth:** JSON Web Tokens (JWT) for authentication, bcrypt for password hashing, and custom middleware for route protection
- **File Handling:** Multer (Local file system processing for image uploads)

## Database DDL & Schema
The complete Data Definition Language (DDL) and database schema setup instructions can be found in the [`blog.sql`](./blog.sql) file located in the root of the repository. It includes all table creations (`users`, `connections`, `diaries`, `photos`, `game_states`) and relational constraints required to run the application.

## Extra Features Implemented Beyond Course Scope
- **Dynamic Switch Space Navigation:** A seamless, messaging-app-style sidebar that allows you to maintain and easily switch between multiple connections (e.g., partners, siblings, best friends) without reloading the page.
- **Milestone Countdowns & Celebrations:** Automated countdown tickers track birthdays and anniversaries. The dashboard automatically overrides the UI with personalized celebration banners when the day arrives.
- **Dynamic Lovers Theme:** When linked with a romantic partner, the application automatically transforms the UI palette to a specific aesthetic, adapting icons and contextually renaming features.
- **Dual Diary System:** Ability to keep personal notes private or use a floating modal to instantly publish entries to a synchronized Shared Diary timeline.
- **Real-Time Arcade:** A synchronized, polling-based Tic-Tac-Toe matrix embedded directly into the workspace for quick shared gameplay.
