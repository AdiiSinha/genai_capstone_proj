export const teams=[
["Rahul Mehta","Phoenix","Can you review the deployment approval before 5 PM today?","critical"],
["Neha Kapoor","Atlas","I'm still waiting for the database credentials from DevOps.","high"],
["Vikram Rao","Phoenix","Client demo is at 4 PM. Please verify the login defect before the demo.","high"],
["Ananya Singh","Nova","I'll share the test report by EOD.","medium"],
["HR Bot","People","Join the wellness program this month. Registration is open.","low"],
["Daily Digest","General","Capgemini daily digest: campus and learning updates.","low"],
["Facilities","Workplace","Shuttle B is operating from Gate 2 every 20 minutes.","low"]];
export const tasks=[
["Review Phoenix deployment approval","Phoenix","Today · 5:00 PM","critical","Blocks deployment."],
["Verify Atlas login defect","Atlas","Today · 3:30 PM","high","Client demo is at 4 PM."],
["Send Nova test report","Nova","Today · EOD","medium","You committed to share it."],
["Complete security training","Learning","Tomorrow","low","Training deadline."]];
export const rooms=[["Orion 1","4F",8,true,"3:30 PM"],["Orion 2","4F",12,false,"4:15 PM"],["Sirius","5F",6,true,"5:00 PM"]];
export const buses=[["Shuttle A","Whitefield → Campus","Gate 1","6 min"],["Shuttle B","KR Puram → Campus","Gate 2","14 min"],["Buggy 03","Campus internal","Main Lobby","2 min"]];
export const news=[["⚡","Campus maintenance notice","Check the latest facilities email for scheduled maintenance timing."],["✦","Wellness program","Join the employee wellness program. Registration is open."],["◈","Capgemini Daily Digest","Daily learning, people and campus updates."]];
export const projects=[["Phoenix","Needs attention",2,1,"red"],["Atlas","Needs attention",1,1,"amber"],["Nova","On track",1,0,"green"]];

export const detailedProjects = [
  {
    id: "phoenix",
    name: "Phoenix",
    code: "PHX-2026",
    status: "Needs attention",
    color: "red",
    description: "Next-generation core Workday integration platform & microservices architecture deployment.",
    manager: {
      name: "Rahul Mehta",
      role: "Engineering Director",
      email: "rahul.mehta@capgemini.com",
      avatar: "RM"
    },
    sprint: {
      number: 14,
      title: "Sprint 14 - Prod Readiness",
      startDate: "Sep 15, 2026",
      endDate: "Sep 29, 2026",
      progress: 68,
      daysLeft: 4
    },
    stats: { openDefects: 2, pendingApprovals: 1, actions: 2, blockers: 1 },
    blockers: [
      {
        id: "BLK-101",
        title: "Azure DevOps Production Deployment Approval Pending",
        severity: "Critical",
        owner: "Rahul Mehta",
        reportedDate: "Sep 18, 2026",
        impact: "Blocks v2.4 microservices pipeline rollout scheduled for 5:00 PM today.",
        status: "Active"
      }
    ],
    team: [
      { name: "Rahul Mehta", role: "Engineering Lead", avatar: "RM", email: "rahul.mehta@capgemini.com" },
      { name: "Vikram Rao", role: "Senior QA Engineer", avatar: "VR", email: "vikram.rao@capgemini.com" },
      { name: "Priya Sharma", role: "DevOps Architect", avatar: "PS", email: "priya.sharma@capgemini.com" },
      { name: "Amit Kumar", role: "Backend Lead", avatar: "AK", email: "amit.kumar@capgemini.com" }
    ],
    deadlines: [
      { title: "Prod Deployment Gate Review", date: "Today · 5:00 PM", status: "Urgent", risk: "High" },
      { title: "Client Live Demo", date: "Today · 4:00 PM", status: "In Progress", risk: "Medium" },
      { title: "Security Compliance Audit Sign-off", date: "Sep 25, 2026", status: "Upcoming", risk: "Low" }
    ],
    actions: [
      { title: "Review Phoenix deployment approval", due: "Today · 5:00 PM", priority: "critical", why: "Blocks deployment." },
      { title: "Verify login defect before 4 PM client demo", due: "Today · 3:30 PM", priority: "high", why: "Client demo requirement." }
    ]
  },
  {
    id: "atlas",
    name: "Atlas",
    code: "ATL-2026",
    status: "Needs attention",
    color: "amber",
    description: "Global enterprise resource planning migration & real-time analytics pipeline.",
    manager: {
      name: "Neha Kapoor",
      role: "Senior Technical Program Manager",
      email: "neha.kapoor@capgemini.com",
      avatar: "NK"
    },
    sprint: {
      number: 9,
      title: "Sprint 9 - Data Ingestion",
      startDate: "Sep 10, 2026",
      endDate: "Sep 24, 2026",
      progress: 52,
      daysLeft: 5
    },
    stats: { openDefects: 1, pendingApprovals: 1, actions: 1, blockers: 1 },
    blockers: [
      {
        id: "BLK-204",
        title: "Waiting for Staging Database Credentials from DevOps",
        severity: "High",
        owner: "Neha Kapoor",
        reportedDate: "Sep 17, 2026",
        impact: "Data team cannot execute benchmark migration testing on staging cluster.",
        status: "Escalated"
      }
    ],
    team: [
      { name: "Neha Kapoor", role: "Program Manager", avatar: "NK", email: "neha.kapoor@capgemini.com" },
      { name: "Siddharth Joshi", role: "Data Engineer Lead", avatar: "SJ", email: "siddharth.j@capgemini.com" },
      { name: "Kavita Reddy", role: "Frontend Specialist", avatar: "KR", email: "kavita.r@capgemini.com" }
    ],
    deadlines: [
      { title: "Staging DB Credential Handover", date: "Sep 20, 2026", status: "Blocked", risk: "High" },
      { title: "Analytics Pipeline Benchmark", date: "Sep 24, 2026", status: "Upcoming", risk: "Medium" }
    ],
    actions: [
      { title: "Verify Atlas login defect", due: "Today · 3:30 PM", priority: "high", why: "Client demo at 4 PM." }
    ]
  },
  {
    id: "nova",
    name: "Nova",
    code: "NVA-2026",
    status: "On track",
    color: "green",
    description: "AI-powered Employee Experience Copilot & HR automated workflow suite.",
    manager: {
      name: "Ananya Singh",
      role: "Lead AI Product Manager",
      email: "ananya.singh@capgemini.com",
      avatar: "AS"
    },
    sprint: {
      number: 18,
      title: "Sprint 18 - LangGraph Integration",
      startDate: "Sep 12, 2026",
      endDate: "Sep 26, 2026",
      progress: 85,
      daysLeft: 7
    },
    stats: { openDefects: 1, pendingApprovals: 0, actions: 1, blockers: 0 },
    blockers: [],
    team: [
      { name: "Ananya Singh", role: "AI PM Lead", avatar: "AS", email: "ananya.singh@capgemini.com" },
      { name: "Aditya Sinha", role: "Lead GenAI Engineer", avatar: "AS", email: "aditya.sinha@capgemini.com" },
      { name: "Rohan Verma", role: "Full Stack Dev", avatar: "RV", email: "rohan.v@capgemini.com" },
      { name: "Sneha Nair", "role": "UX Researcher", avatar: "SN", email: "sneha.n@capgemini.com" }
    ],
    deadlines: [
      { title: "Share EOD Test Suite Report", date: "Today · EOD", status: "On Track", risk: "Low" },
      { title: "HITL Workflow Verification", date: "Sep 22, 2026", status: "Upcoming", risk: "Low" },
      { title: "Capstone Final Demonstration", date: "Sep 28, 2026", status: "Milestone", risk: "Low" }
    ],
    actions: [
      { title: "Send Nova test report", due: "Today · EOD", priority: "medium", why: "Committed share date." }
    ]
  }
];