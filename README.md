# 🪐 Space Binder

**Space Binder** is a full-stack, interactive workspace designed to keep you connected with the people who matter most. Built with Node.js and PostgreSQL, it functions as a dynamic shared portal where connected users can maintain personal and shared diaries, upload photos to a collaborative gallery, track relationship milestones, and even play mini-games. 

## ✨ Core Features

* **👥 Dynamic "Switch Space" Navigation:** A seamless, messaging-app-style sidebar that allows you to maintain and easily switch between multiple connections (partners, siblings, best friends) without reloading the page.
* **📓 Dual Diary System:** Keep personal notes private, or use the floating **Add Notes** modal to instantly publish entries to a synchronized Shared Diary timeline.
* **📸 Shared Photo Gallery:** Upload memories via a dedicated modal. Images are securely processed and displayed in a synchronized, responsive grid layout for both users to see.
* **⏰ Milestone Countdowns & Celebrations:** Automated countdown tickers track birthdays and anniversaries. When the special day arrives, the dashboard automatically overrides the UI with personalized "Today is the Day!" celebration banners.
* **💖 Dynamic "Lovers" Theme:** When linked with a romantic partner, the application automatically transforms the UI palette to a soft pink aesthetic, replaces standard icons with cute emojis, and contextually renames features (e.g., "Add Notes" becomes "Send Love Letter").
* **🎮 Real-Time Arcade:** A synchronized, polling-based Tic-Tac-Toe matrix embedded directly into the workspace for quick shared gameplay.

## 🛠️ Tech Stack

* **Frontend:** Vanilla JavaScript, HTML5, CSS3 (Custom Responsive Grid/Flexbox UI)
* **Backend:** Node.js, Express.js
* **Database:** PostgreSQL (Relational data for users, connections, diaries, and photos)
* **File Handling:** Multer (Local file system processing for image uploads)

## 🚀 Local Installation & Setup

To run Space Binder locally on your machine, follow these steps:

### 1. Prerequisites
* [Node.js](https://nodejs.org/) installed
* [PostgreSQL](https://www.postgresql.org/) installed and running

### 2. Clone the Repository

bash
git clone [https://github.com/yourusername/space-binder.git](https://github.com/yourusername/space-binder.git)
cd space-binder


###3. Install Dependencies
Bash

npm install

###4. Environment Configuration

Create a .env file in the root directory and configure your PostgreSQL database credentials and session secrets:
Code snippet

PORT=5000
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=space_binder_db
DB_PORT=5432
SESSION_SECRET=your_super_secret_key

###5. Database Setup

Ensure your PostgreSQL database is created. The application requires the following tables to be initialized:

    users

    connections

    diaries

    game_states

    photos

###6. Run the Application
Bash

npm run dev 

The application will be live at http://localhost:5000.
📂 Project Structure
Plaintext

├── config/                 # Database connection logic
├── controller/             # Backend route logic (diaries, games, photos, connections)
├── middleware/             # Authentication and security protections
├── models/                 # PostgreSQL database queries and schemas
├── public/                 # Frontend assets
│   ├── portal.html         # Main dashboard layout & UI modals
│   ├── portal.js           # Client-side state, fetching, and DOM logic
│   └── uploads/            # Local directory for shared gallery images
├── routes/                 # Express API endpoint definitions
├── app.js                  # Express server initialization
└── package.json            # Node dependencies and scripts

🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.
📝 License

This project is open-source and available under the MIT License.
