// Single source of truth for track content on the server.
// The backend uses this to validate level indexes, generate assessments for the
// right topic, and review projects against their real requirements — so a
// client can never substitute its own project description or level.

// Module 2.1 — five built-in tracks.
const LANGUAGES = ["python", "cpp", "java", "javascript", "react"];

const LANG_LABEL = { python: "Python", cpp: "C++", java: "Java", javascript: "JavaScript", react: "React" };

// Code-fence name used when asking the AI for code in this track.
const CODE_LANG = { python: "python", cpp: "cpp", java: "java", javascript: "javascript", react: "jsx" };

// Shown on the track-selection screen.
const TRACK_INFO = {
  python:     { icon: "🐍", badge: "🏆 Most Popular",     tagline: "The perfect first language — readable, powerful, and in demand everywhere.", focus: "Data science, web & AI projects" },
  cpp:        { icon: "⚡", badge: "⚡ High Performance",  tagline: "Master speed and control — the language behind games, systems, and OS.",    focus: "Systems, games & OS projects" },
  java:       { icon: "☕", badge: "🏢 Industry Standard", tagline: "Strongly-typed OOP that powers Android apps and enterprise back-ends.",       focus: "OOP, Android & backend projects" },
  javascript: { icon: "🟨", badge: "🌐 Language of the Web", tagline: "Make web pages interactive and build full-stack apps with one language.", focus: "Web, DOM & async projects" },
  react:      { icon: "⚛️", badge: "🚀 Modern Frontend",   tagline: "Build fast, component-based user interfaces the way modern teams do.",       focus: "Real UI & app projects" },
};

// File extensions accepted for project uploads, per track.
const PROJECT_EXTENSIONS = {
  python: [".py"],
  cpp: [".cpp", ".cc", ".cxx", ".h", ".hpp"],
  java: [".java"],
  javascript: [".js", ".mjs"],
  react: [".jsx", ".js", ".tsx"],
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
  java: [
    { title: "Setup & First Program", cat: "beginner",     sub: "JDK · main() · System.out.println · compile & run" },
    { title: "Variables & Types",     cat: "beginner",     sub: "int · double · char · boolean · String · var" },
    { title: "Input & Output",        cat: "beginner",     sub: "Scanner · printf · string formatting" },
    { title: "Conditions",            cat: "beginner",     sub: "if · else if · switch · ternary operator" },
    { title: "Loops",                 cat: "beginner",     sub: "for · while · do-while · break · continue" },
    { title: "Methods",               cat: "intermediate", sub: "parameters · return types · overloading · static" },
    { title: "Arrays",                cat: "intermediate", sub: "1D/2D arrays · Arrays class · enhanced for" },
    { title: "Strings",               cat: "intermediate", sub: "String methods · StringBuilder · immutability" },
    { title: "OOP — Classes",         cat: "intermediate", sub: "fields · constructors · this · access modifiers" },
    { title: "OOP — Inheritance",     cat: "intermediate", sub: "extends · super · method overriding" },
    { title: "Polymorphism & Interfaces", cat: "intermediate", sub: "abstract classes · interfaces · dynamic dispatch" },
    { title: "Exception Handling",    cat: "intermediate", sub: "try · catch · finally · throw · custom exceptions" },
    { title: "Collections",           cat: "intermediate", sub: "ArrayList · HashMap · HashSet · iteration" },
    { title: "Generics",              cat: "intermediate", sub: "generic classes · generic methods · bounded types" },
    { title: "File Handling",         cat: "intermediate", sub: "File · BufferedReader · FileWriter · try-with-resources" },
    { title: "Recursion",             cat: "advanced",     sub: "recursive methods · base case · call stack · memoization" },
    { title: "Data Structures",       cat: "advanced",     sub: "LinkedList · Stack · Queue · binary trees" },
    { title: "Algorithms",            cat: "advanced",     sub: "sorting · searching · complexity" },
    { title: "Mini Project",          cat: "advanced",     sub: "design · implementation · testing" },
    { title: "Final Challenge",       cat: "advanced",     sub: "capstone problems · review · certification" },
  ],
  javascript: [
    { title: "Hello JavaScript",      cat: "beginner",     sub: "console.log · script tag · Node.js · comments" },
    { title: "Variables & Types",     cat: "beginner",     sub: "let · const · primitives · typeof" },
    { title: "Operators",             cat: "beginner",     sub: "arithmetic · comparison · === vs == · logical operators" },
    { title: "Conditions",            cat: "beginner",     sub: "if · else · switch · ternary · truthy/falsy" },
    { title: "Loops",                 cat: "beginner",     sub: "for · while · for...of · for...in · break · continue" },
    { title: "Functions",             cat: "intermediate", sub: "declarations · arrow functions · parameters · return" },
    { title: "Arrays",                cat: "intermediate", sub: "array methods · map · filter · reduce · spread" },
    { title: "Objects",               cat: "intermediate", sub: "properties · methods · destructuring · JSON" },
    { title: "Strings",               cat: "intermediate", sub: "string methods · template literals · regex basics" },
    { title: "Scope & Closures",      cat: "intermediate", sub: "block scope · hoisting · closures" },
    { title: "DOM Manipulation",      cat: "intermediate", sub: "querySelector · events · createElement" },
    { title: "Error Handling",        cat: "intermediate", sub: "try · catch · throw · Error types" },
    { title: "Classes & OOP",         cat: "intermediate", sub: "class · constructor · extends · this" },
    { title: "Modules",               cat: "intermediate", sub: "import · export · npm basics" },
    { title: "Asynchronous JS",       cat: "intermediate", sub: "callbacks · promises · event loop" },
    { title: "Async/Await & Fetch",   cat: "advanced",     sub: "async · await · fetch API · handling errors" },
    { title: "Data Structures",       cat: "advanced",     sub: "Map · Set · stacks · queues" },
    { title: "Algorithms",            cat: "advanced",     sub: "sorting · searching · recursion" },
    { title: "Mini Project",          cat: "advanced",     sub: "design · implementation · testing" },
    { title: "Final Challenge",       cat: "advanced",     sub: "capstone problems · review · certification" },
  ],
  react: [
    { title: "React Setup",           cat: "beginner",     sub: "Vite · JSX · components · project structure" },
    { title: "JSX Deep Dive",         cat: "beginner",     sub: "expressions · attributes · fragments" },
    { title: "Components & Props",    cat: "beginner",     sub: "function components · props · children" },
    { title: "State with useState",   cat: "beginner",     sub: "state · re-rendering · updating state" },
    { title: "Event Handling",        cat: "beginner",     sub: "onClick · onChange · event object" },
    { title: "Conditional Rendering", cat: "intermediate", sub: "&& · ternary · early return" },
    { title: "Lists & Keys",          cat: "intermediate", sub: "map · keys · rendering arrays" },
    { title: "Forms",                 cat: "intermediate", sub: "controlled inputs · validation · submit" },
    { title: "useEffect",             cat: "intermediate", sub: "side effects · dependency array · cleanup" },
    { title: "Fetching Data",         cat: "intermediate", sub: "fetch · loading state · error state" },
    { title: "Lifting State Up",      cat: "intermediate", sub: "shared state · props drilling · callbacks" },
    { title: "Context API",           cat: "intermediate", sub: "createContext · useContext · providers" },
    { title: "Custom Hooks",          cat: "intermediate", sub: "reusing logic · rules of hooks" },
    { title: "React Router",          cat: "intermediate", sub: "routes · links · URL params · navigation" },
    { title: "Styling",               cat: "intermediate", sub: "CSS modules · Tailwind · conditional classes" },
    { title: "useReducer",            cat: "advanced",     sub: "reducer · actions · complex state" },
    { title: "Performance",           cat: "advanced",     sub: "useMemo · useCallback · React.memo" },
    { title: "Testing",               cat: "advanced",     sub: "React Testing Library · Vitest basics" },
    { title: "Mini Project",          cat: "advanced",     sub: "design · implementation · testing" },
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
  java: [
    { id: 0, title: "Unit Converter",              desc: "Convert temperature, length and weight units from a menu, using methods and Scanner input with validation.", difficulty: "Easy" },
    { id: 1, title: "Simple Bank Account",         desc: "A BankAccount class with deposit, withdraw (no overdraft) and balance, driven by a console menu.",             difficulty: "Easy" },
    { id: 2, title: "Number Guessing Game",        desc: "Random number with higher/lower hints, a limited number of tries and a play-again option.",                   difficulty: "Easy" },
    { id: 3, title: "Library Management System",   desc: "Book and Member classes stored in ArrayLists; issue, return, search and list books.",                          difficulty: "Medium" },
    { id: 4, title: "Student Records with Files",  desc: "Add, search, sort and delete student records, saving them to a text file with try-with-resources.",            difficulty: "Medium" },
    { id: 5, title: "Inventory Tracker",           desc: "Track products in a HashMap with add, update stock, remove and a low-stock report.",                            difficulty: "Medium" },
    { id: 6, title: "Shape Hierarchy",             desc: "Abstract Shape class with Circle, Rectangle and Triangle; compute areas polymorphically and sort by area.",     difficulty: "Medium" },
    { id: 7, title: "Tic-Tac-Toe",                 desc: "Two-player console Tic-Tac-Toe on a 2D array with win and draw detection.",                                     difficulty: "Hard" },
    { id: 8, title: "Generic Linked List & Stack", desc: "Implement a generic singly linked list from scratch, then build a Stack<T> on top of it with tests in main().", difficulty: "Hard" },
    { id: 9, title: "Employee Payroll System",     desc: "Employee hierarchy (salaried, hourly, intern) with an interface for pay, custom exceptions and a payroll report.", difficulty: "Hard" },
  ],
  javascript: [
    { id: 0, title: "Tip Calculator",              desc: "Functions that split a bill with tip between people, validating inputs and formatting currency.",              difficulty: "Easy" },
    { id: 1, title: "To-Do List (DOM)",            desc: "Add, complete and delete tasks on a web page using DOM methods and event listeners.",                           difficulty: "Easy" },
    { id: 2, title: "Rock Paper Scissors",         desc: "Play against the computer, keep score and declare a winner after five rounds.",                                difficulty: "Easy" },
    { id: 3, title: "Quiz App",                    desc: "Questions stored in an array of objects; show one at a time, check answers and show the final score.",          difficulty: "Medium" },
    { id: 4, title: "Expense Tracker",             desc: "Add expenses by category, show totals with reduce, and save everything in localStorage.",                       difficulty: "Medium" },
    { id: 5, title: "Weather Fetcher",             desc: "Fetch weather for a city from a public API with async/await, showing loading and error messages.",              difficulty: "Medium" },
    { id: 6, title: "Text Analyzer",               desc: "Count words, sentences and characters and list the five most frequent words in a given text.",                  difficulty: "Medium" },
    { id: 7, title: "Bank Simulator with Classes", desc: "Account and SavingsAccount classes with deposit, withdraw, interest and transaction history.",                  difficulty: "Hard" },
    { id: 8, title: "Promise Task Scheduler",      desc: "Run async tasks with a concurrency limit, retries on failure and a summary when all finish.",                   difficulty: "Hard" },
    { id: 9, title: "Library Inventory Module",    desc: "An ES module exporting functions to add, search, borrow and return books, with a small demo script.",           difficulty: "Hard" },
  ],
  react: [
    { id: 0, title: "Step Counter",                desc: "A counter component with increment, decrement, reset and a configurable step size using useState.",            difficulty: "Easy" },
    { id: 1, title: "Profile Card List",           desc: "Render a list of profile cards from an array using props and keys, with a reusable Card component.",            difficulty: "Easy" },
    { id: 2, title: "Todo App",                    desc: "Add, toggle and delete todos with filters for all, active and completed.",                                     difficulty: "Easy" },
    { id: 3, title: "Validated Signup Form",       desc: "Controlled form with field-level validation messages and a disabled submit until the form is valid.",          difficulty: "Medium" },
    { id: 4, title: "Weather Search",              desc: "Search a city and fetch its weather in useEffect, with loading, error and empty states.",                       difficulty: "Medium" },
    { id: 5, title: "Shopping Cart",               desc: "Product list and cart sharing lifted state; add, remove, change quantity and show the total.",                  difficulty: "Medium" },
    { id: 6, title: "Theme Switcher",              desc: "Light/dark theme provided through Context and toggled from a nested component.",                                difficulty: "Medium" },
    { id: 7, title: "Notes App with useReducer",   desc: "Create, edit, delete and search notes with all state changes handled by a reducer.",                            difficulty: "Hard" },
    { id: 8, title: "Paginated Data Table",        desc: "Fetch data through a custom hook and show it in a table with sorting and pagination.",                          difficulty: "Hard" },
    { id: 9, title: "Multi-Page App with Router",  desc: "A small app with React Router: home, list, detail page from a URL param, and a not-found page.",                difficulty: "Hard" },
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
  // Module 4.4 — similarity to another student's submission (0-1).
  plagiarismFlag: Number(process.env.PLAGIARISM_THRESHOLD) || 0.85, // not counted, sent for review
  plagiarismWarn: 0.6,                                               // warning only
  plagiarismMinFingerprints: 8,                                      // tiny programs are never flagged
};

function isLanguage(lang) {
  return LANGUAGES.includes(lang);
}

// Everything the frontend needs to show one track.
function trackSummary(language) {
  return {
    language,
    label: LANG_LABEL[language],
    codeLang: CODE_LANG[language],
    ...TRACK_INFO[language],
    totalLevels: TOTAL_LEVELS,
    projectExtensions: PROJECT_EXTENSIONS[language],
  };
}

module.exports = {
  LANGUAGES,
  LANG_LABEL,
  CODE_LANG,
  TRACK_INFO,
  trackSummary,
  PROJECT_EXTENSIONS,
  LEVELS,
  PROJECTS,
  TOTAL_LEVELS,
  RULES,
  isLanguage,
};
