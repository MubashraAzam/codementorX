// Single source of truth for track content on the server.
// The backend uses this to validate level indexes, generate assessments for the
// right topic, and review projects against their real requirements — so a
// client can never substitute its own project description or level.

const LANGUAGES = ["python", "cpp"];

const LANG_LABEL = { python: "Python", cpp: "C++" };

// File extensions accepted for project uploads, per track.
const PROJECT_EXTENSIONS = {
  python: [".py"],
  cpp: [".cpp", ".cc", ".cxx", ".h", ".hpp"],
};

const LEVELS = {
  python: [
    { title: "Hello World & Setup",   cat: "beginner",     sub: "print · comments · indentation" },
    { title: "Variables & Types",     cat: "beginner",     sub: "int · float · string · bool · type()" },
    { title: "Input & Output",        cat: "beginner",     sub: "input() · output · f-strings" },
    { title: "Conditions",            cat: "beginner",     sub: "if · elif · else · comparison operators" },
    { title: "Loops",                 cat: "beginner",     sub: "for · while · break · continue · range()" },
    { title: "Functions",             cat: "intermediate", sub: "def · parameters · return · scope" },
    { title: "Lists & Arrays",        cat: "intermediate", sub: "list creation · indexing · slicing · methods" },
    { title: "Strings",               cat: "intermediate", sub: "string methods · slicing · formatting" },
    { title: "Dictionaries",          cat: "intermediate", sub: "key-value pairs · dict methods · iteration" },
    { title: "File Handling",         cat: "intermediate", sub: "open() · read · write · with statement" },
    { title: "Error Handling",        cat: "intermediate", sub: "try · except · finally · custom exceptions" },
    { title: "OOP — Classes",         cat: "intermediate", sub: "class · __init__ · self · methods" },
    { title: "OOP — Inheritance",     cat: "intermediate", sub: "inheritance · super() · polymorphism" },
    { title: "Modules",               cat: "intermediate", sub: "import · pip · os · math · random" },
    { title: "Problem Solving I",     cat: "intermediate", sub: "algorithms · Big-O · common patterns" },
    { title: "Recursion",             cat: "advanced",     sub: "recursive functions · base case · call stack" },
    { title: "Data Structures",       cat: "advanced",     sub: "stacks · queues · linked lists" },
    { title: "Algorithms",            cat: "advanced",     sub: "sorting · searching · binary search" },
    { title: "Mini Project",          cat: "advanced",     sub: "design · implementation · testing" },
    { title: "Final Challenge",       cat: "advanced",     sub: "capstone problems · review · certification" },
  ],
  cpp: [
    { title: "Setup & First Program", cat: "beginner",     sub: "cout · cin · #include · main()" },
    { title: "Variables & Types",     cat: "beginner",     sub: "int · float · string · bool · auto" },
    { title: "Input & Output",        cat: "beginner",     sub: "cin · cout · endl · formatting" },
    { title: "Conditions",            cat: "beginner",     sub: "if · else if · else · switch" },
    { title: "Loops",                 cat: "beginner",     sub: "for · while · do-while · break · continue" },
    { title: "Functions",             cat: "intermediate", sub: "declaration · parameters · return · overloading" },
    { title: "Arrays",                cat: "intermediate", sub: "1D/2D arrays · indexing · sorting" },
    { title: "Strings",               cat: "intermediate", sub: "string class · methods · c-strings" },
    { title: "Pointers",              cat: "intermediate", sub: "& · * · pointer arithmetic · references" },
    { title: "File Handling",         cat: "intermediate", sub: "fstream · ifstream · ofstream · modes" },
    { title: "Error Handling",        cat: "intermediate", sub: "try · catch · throw · exception classes" },
    { title: "OOP — Classes",         cat: "intermediate", sub: "class · constructor · destructor · access specifiers" },
    { title: "OOP — Inheritance",     cat: "intermediate", sub: "inheritance · virtual · polymorphism · override" },
    { title: "Templates",             cat: "intermediate", sub: "function templates · class templates · generic programming" },
    { title: "STL",                   cat: "intermediate", sub: "vector · map · set · algorithms · iterators" },
    { title: "Recursion",             cat: "advanced",     sub: "recursive functions · base case · memoization" },
    { title: "Data Structures",       cat: "advanced",     sub: "linked list · stack · queue · tree" },
    { title: "Algorithms",            cat: "advanced",     sub: "sorting · searching · complexity · dynamic programming" },
    { title: "Mini Project",          cat: "advanced",     sub: "design · implementation · testing · documentation" },
    { title: "Final Challenge",       cat: "advanced",     sub: "capstone problems · review · certification" },
  ],
};

const PROJECTS = {
  python: [
    { id: 0, title: "Student Grade Calculator",   desc: "Build a program that takes marks for 5 subjects and calculates GPA, grade, and pass/fail status.",       difficulty: "Easy" },
    { id: 1, title: "Library Book Manager",        desc: "Create a console app to add, search, remove, and list books using lists and dictionaries.",              difficulty: "Easy" },
    { id: 2, title: "Simple ATM Machine",          desc: "Simulate an ATM: login with PIN, check balance, deposit, withdraw, with proper validation.",            difficulty: "Easy" },
    { id: 3, title: "Weather Data Analyzer",       desc: "Read a CSV of daily temperatures, calculate averages, find hottest/coldest days, and plot a chart.",    difficulty: "Medium" },
    { id: 4, title: "Contact Book App",            desc: "Build a contact manager with add/search/edit/delete using file handling to persist data.",               difficulty: "Medium" },
    { id: 5, title: "Quiz Game",                   desc: "Create a multiple-choice quiz app with a timer, score tracking, and a leaderboard saved to file.",      difficulty: "Medium" },
    { id: 6, title: "Expense Tracker",             desc: "Track daily expenses by category, show monthly summaries, and warn when a budget limit is exceeded.",    difficulty: "Medium" },
    { id: 7, title: "Text-Based Adventure Game",   desc: "Design a story-driven game with branching choices, inventory, and at least 3 different endings.",        difficulty: "Hard" },
    { id: 8, title: "Student Management System",   desc: "Full OOP project: classes for Student, Course, Teacher with file-based storage and a menu-driven UI.",  difficulty: "Hard" },
    { id: 9, title: "Chat Bot (Rule-Based)",       desc: "Build a rule-based chatbot that answers FAQs, remembers user name, and logs conversations to a file.",  difficulty: "Hard" },
  ],
  cpp: [
    { id: 0, title: "Temperature Converter",       desc: "Convert between Celsius, Fahrenheit, and Kelvin with input validation and formatted output.",            difficulty: "Easy" },
    { id: 1, title: "Simple Calculator",           desc: "Build a calculator with all operators, error handling for division by zero, and a history log.",        difficulty: "Easy" },
    { id: 2, title: "Number Guessing Game",        desc: "Generate a random number; player guesses with hints (higher/lower) and a limited number of tries.",     difficulty: "Easy" },
    { id: 3, title: "Student Record System",       desc: "OOP project using classes to store, search, sort, and display student records with file I/O.",          difficulty: "Medium" },
    { id: 4, title: "Linked List Implementation",  desc: "Implement a singly linked list with insert, delete, search, and reverse operations from scratch.",      difficulty: "Medium" },
    { id: 5, title: "Bank Account System",         desc: "Simulate accounts with deposit, withdraw, transfer, and statement history using OOP and file handling.", difficulty: "Medium" },
    { id: 6, title: "Stack & Queue Library",       desc: "Build your own Stack and Queue classes using arrays, then solve 3 real problems using each.",           difficulty: "Medium" },
    { id: 7, title: "Mini Shell Interpreter",      desc: "Parse and execute simple shell commands (ls, cd, echo) using string parsing and system calls.",         difficulty: "Hard" },
    { id: 8, title: "Binary Search Tree",          desc: "Implement a BST with insert, delete, search, and all three traversals. Visualise output in the console.", difficulty: "Hard" },
    { id: 9, title: "Inventory Management System", desc: "Full OOP system: Product, Category, Stock classes with file persistence, search, and low-stock alerts.", difficulty: "Hard" },
  ],
};

const TOTAL_LEVELS = 20;

// Rules that gate the viva and the certificate. Kept in one place so the
// interview route, the certificate route and the UI copy cannot drift apart.
const RULES = {
  levelsRequired: TOTAL_LEVELS,
  projectsRequired: 5,
  projectPassStars: 2,
  interviewPassPercent: 75,
  maxProjectCodeChars: 60000,
};

function isLanguage(lang) {
  return LANGUAGES.includes(lang);
}

module.exports = {
  LANGUAGES,
  LANG_LABEL,
  PROJECT_EXTENSIONS,
  LEVELS,
  PROJECTS,
  TOTAL_LEVELS,
  RULES,
  isLanguage,
};
