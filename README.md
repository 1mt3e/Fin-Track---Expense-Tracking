# 💰 FinTrack — Personal Expense Tracker

---

## 🌐 Live Demo

🔗 [https://fintr4ck.netlify.app](https://fintr4ck.netlify.app)

> Replace the link above with your actual Netlify URL before submitting.

---

## ✨ Features

- ➕ **Add Expense** — record amount, category, date, and note
- 📋 **View Expenses** — list all expenses sorted by date (newest first)
- ✏️ **Edit Expense** — update any field of an existing expense
- 🗑️ **Delete Expense** — remove an expense with confirmation dialog
- 📊 **View Summary** — total spending and breakdown by category
- ✅ **Input Validation** — rejects empty or negative amounts

### 🎁 Bonus Features

- 🔐 **User Authentication** — Sign Up and Log In screens, with each user's expenses managed separately via localStorage
- 🤖 **AI Auto-Categorize** — uses the Google Gemini API to suggest an expense category based on the note text
- 📈 **Dashboard** — pie chart (by category) and bar chart (by month), built with Chart.js and updated in real time
- 🔔 **Notifications / Reminders** — daily expense reminder (browser notification) and alerts for sudden spending spikes
- 🏷️ **Advanced Tags & Notes** — assign multiple tags to each transaction (e.g., #work, #personal) and filter by tags in addition to categories
- 📑 **Reports Page** — weekly, monthly, and yearly spending reports, month-over-month comparison (line chart), detailed category breakdown (table format), and CSV/PDF export

---

## 🛠️ Tech Stack

| Layer | Tool |
|---|---|
| Code generation | Antigravity |
| UI Design | Stitch by Google & Impeccable |
| Frontend | HTML, CSS, JavaScript |
| Charts | Chart.js |
| AI Categorization | Google Gemini API |
| Data storage | localStorage |
| Deployment | Netlify |

---

## 📁 Project Structure

```
fintrack/
├── index.html        # Main HTML file
├── style.css         # Stylesheet
└── app.js            # Application logic
```
---

## 📋 Software Lifecycle

This project follows the full software development lifecycle taught in CSI106 Chapter 8:

| Phase | Deliverable |
|---|---|
| Analysis | Use Case Diagram, Functional Requirements |
| Design | ERD, Class Diagram, UI Mockups |
| Implementation | Web app built with Antigravity |
| Testing | Black-box test cases (5+) |
| Deployment | Live on Netlify |

---

## 📄 License

This project was created for educational purposes as part of a university exam.
