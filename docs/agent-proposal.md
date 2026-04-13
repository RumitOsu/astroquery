# Agent Pattern Proposal: Intelligent Course Registration Advisor

## Context
This proposal identifies a feature in a university course management system that would benefit from the agent pattern — specifically, an AI-powered course registration advisor that helps students plan their schedules.

## The Problem
Course registration is a frustrating multi-step process that students navigate every semester. They must simultaneously consider:
- **Prerequisite chains** — which courses they're eligible to take based on completed coursework
- **Schedule conflicts** — finding sections that don't overlap
- **Degree requirements** — which categories still need to be fulfilled (core, elective, capstone)
- **Seat availability** — sections that are still open, with waitlist status
- **Professor ratings / workload** — soft factors that affect the student experience

Currently, students bounce between multiple systems: the course catalog, their degree audit, RateMyProfessors, and the registration portal. An advisor meeting helps, but availability is limited and appointments are short.

## Why an Agent Pattern Fits

An agent with tool access is ideal here because:

1. **Multiple heterogeneous data sources** — The agent needs to query a course catalog (structured DB), a degree audit system (rule engine), live seat availability (real-time API), and external review sites (web search). No single query can answer the student's question.

2. **Multi-step reasoning** — "What should I take next semester?" requires: check degree audit → identify unfulfilled requirements → filter by completed prerequisites → check section availability → cross-reference schedule conflicts → optionally check ratings. This is exactly the kind of reasoning chain that ReAct excels at.

3. **Conversational refinement** — Students don't know exactly what they want upfront. They start with "What electives are available?" then narrow down: "Which of those are MWF morning?" → "Does Professor Smith teach any of those?" → "Add that to my cart." Memory-enabled agents handle this naturally.

4. **Tool composition varies per query** — A simple "Am I eligible for CS 450?" only needs the prerequisite checker. A complex "Build me a full schedule for next semester" needs all tools working together. The agent dynamically decides which tools to invoke.

## Proposed Tools

| Tool | Purpose | Data Source |
|------|---------|-------------|
| **DegreeAudit** | Check fulfilled/remaining requirements | University degree audit API |
| **PrereqChecker** | Verify eligibility for a specific course | Course catalog database |
| **SectionSearch** | Find open sections with times, locations, instructors | Registration system API |
| **ScheduleBuilder** | Check for time conflicts, build a conflict-free schedule | Calculator / constraint solver |
| **RatingLookup** | Search professor ratings and course difficulty | Web search (RateMyProfessors, etc.) |

## Example Interaction

```
Student: I need two more IS electives to graduate. What's open next semester 
         that doesn't conflict with my Tuesday/Thursday afternoon capstone?

Agent thinking:
  1. [DegreeAudit] → Student needs 2 IS electives, has completed IS 201, 301, 410
  2. [PrereqChecker] → Eligible for IS 412, 415, 420, 430, 455, 460
  3. [SectionSearch] → Query all eligible courses for next semester sections
  4. [ScheduleBuilder] → Filter out sections conflicting with T/TH 2:00-3:30
  5. [RatingLookup] → Look up ratings for remaining options

Agent: You're eligible for 6 IS electives next semester. After removing T/TH 
       afternoon conflicts, here are your best options:
       
       1. IS 415 (Data Visualization) — MWF 10:00, Prof. Chen (4.2/5, 18/30 seats)
       2. IS 455 (Cloud Computing) — MWF 1:00, Prof. Nakamura (4.5/5, 5/25 seats — filling up!)
       3. IS 430 (Database Admin) — T/TH 9:30, Prof. Williams (3.8/5, 22/35 seats)
       
       I'd recommend locking in IS 455 soon since it's nearly full. Want me to 
       check if any of these fit with your other courses?
```

## Why Not a Simpler Approach?

- **A static recommendation page** can't handle the combinatorial nature of schedule building or respond to follow-up questions.
- **A rule-based system** would require hard-coding every possible query pattern. "Show me easy MWF classes that count toward my minor" isn't a query you can anticipate with fixed logic.
- **A simple chatbot without tools** can't access live seat availability or verify prerequisites — it would hallucinate course offerings.

The agent pattern is the right fit because the task requires dynamic tool selection, multi-step reasoning over heterogeneous data sources, and conversational memory for iterative refinement.
