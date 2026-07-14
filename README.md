# 🚀 SLA Sentinel – AI-Powered Ticket Routing & SLA Breach Prediction in JIRA

> An intelligent machine learning system that predicts SLA breaches and recommends ticket routing to improve IT service management efficiency.

---

## 📌 Overview

SLA Sentinel is an AI-powered application that analyzes support tickets and predicts whether a ticket is likely to breach its Service Level Agreement (SLA). It also assists in intelligent ticket routing, helping support teams prioritize and assign tickets efficiently.

The project combines **Machine Learning**, **Flask**, and **Scikit-learn** to deliver real-time predictions through a simple REST API.

---

## ✨ Features

* 🤖 AI-based SLA breach prediction
* 🎯 Intelligent ticket routing assistance
* ⚡ REST API built with Flask
* 📊 Machine Learning model using Scikit-learn
* 📁 Model serialization with Joblib
* 🔄 Easy model retraining
* 🧩 Modular project structure

---

## 🛠️ Tech Stack

| Category         | Technology   |
| ---------------- | ------------ |
| Language         | Python       |
| Backend          | Flask        |
| Machine Learning | Scikit-learn |
| Data Processing  | Pandas       |
| Model Storage    | Joblib       |
| Package Manager  | pip          |

---

## 📂 Project Structure

```text
AI-Powered-Ticket-Routing-SLA-Breach-Prediction-in-JIRA/
│
├── api/
│   └── app.py
│
├── data/
│
├── ml_model/
│   ├── train_model.py
│   └── sla_model.joblib
│
├── docs/
│
├── screenshots/
│
├── requirements.txt
└── README.md
```

---

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/248x5a0514-boop/sla-sentinel.git
```

Move into the project directory:

```bash
cd sla-sentinel
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

## ▶️ Train the Model

```bash
python ml_model/train_model.py
```

---

## ▶️ Run the API

```bash
python api/app.py
```

The Flask server will start locally and expose the prediction endpoint.

---

## 📡 API

### Predict SLA Breach

**POST**

```http
POST /predict
```

Example Request

```json
{
  "priority": "High",
  "category": "Bug",
  "description": "Production issue causing downtime."
}
```

Example Response

```json
{
  "sla_breach": true,
  "confidence": 0.94
}
```

---

## 📊 Machine Learning Workflow

1. Collect historical ticket data.
2. Clean and preprocess the dataset.
3. Train the ML model.
4. Save the trained model using Joblib.
5. Load the model in the Flask API.
6. Predict SLA breach probability for incoming tickets.

---

## 🎯 Future Enhancements

* Deep Learning models
* JIRA API integration
* Real-time ticket synchronization
* Interactive dashboard
* Docker support
* Cloud deployment
* Authentication & Authorization
* Automated model retraining

---

## 🤝 Contributing

Contributions are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a Pull Request

---

## 📜 License

This project is intended for educational and learning purposes. Add an appropriate open-source license if you plan to distribute it publicly.

---

## 👨‍💻 Author

**Jai**

GitHub: https://github.com/248x5a0514-boop

---

⭐ If you found this project useful, consider giving it a **Star** on GitHub!

