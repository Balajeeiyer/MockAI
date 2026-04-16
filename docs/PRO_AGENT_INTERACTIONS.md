# PRo Agent Interaction & Communication Flow

## Overview

This document explains how the four PRo agents (workflows) interact, communicate, and coordinate to provide comprehensive PR analysis. While workflows run independently, they create a cohesive user experience through strategic timing, shared data sources, and complementary responsibilities.

---

## Agent Architecture

```mermaid
graph TB
    subgraph "GitHub Event Layer"
        A[PR Created/Updated Event]
    end
    
    subgraph "Agent Orchestration Layer"
        B[GitHub Actions Runner]
    end
    
    subgraph "PRo Agents Independent Execution"
        C[Agent 1: Conflict Status<br/>Priority: IMMEDIATE<br/>Time: ~10s]
        D[Agent 2: Merge Bot<br/>Priority: HIGH<br/>Time: ~1-2min]
        E[Agent 3: Security Bot<br/>Priority: HIGH<br/>Time: ~2-3min]
        F[Agent 4: CI/CD Pipeline<br/>Priority: MEDIUM<br/>Time: ~3-5min]
    end
    
    subgraph "Data Sources Shared"
        G[(GitHub REST API)]
        H[(Git Repository)]
        I[(PR Metadata)]
    end
    
    subgraph "Output Layer"
        J[GitHub PR UI]
        K[Comments]
        L[Review Comments<br/>Inline Suggestions]
        M[Labels]
        N[Check Runs]
    end
    
    A --> B
    B --> C
    B --> D
    B --> E
    B --> F
    
    C --> G
    D --> G
    E --> G
    F --> G
    
    C --> H
    D --> H
    E --> H
    F --> H
    
    C --> I
    D --> I
    E --> I
    F --> I
    
    C --> M
    C --> N
    D --> K
    E --> K
    E --> L
    F --> K
    F --> L
    
    M --> J
    N --> J
    K --> J
    L --> J
    
    style C fill:#e1f5fe
    style D fill:#fff3e0
    style E fill:#f3e5f5
    style F fill:#e8f5e9
    style J fill:#c8e6c9
```

---

## Agent Communication Patterns

### **Pattern 1: No Direct Communication (Independent Agents)**

PRo agents do NOT communicate directly with each other. Instead, they:
1. All read from the same data sources (GitHub API, Git repo)
2. All write to the same destination (PR UI)
3. Execute independently and in parallel
4. Coordinate through **timing**, **priorities**, and **complementary responsibilities**

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant GH as GitHub
    participant A1 as Conflict Status Agent
    participant A2 as Merge Bot Agent
    participant A3 as Security Bot Agent
    participant A4 as CI/CD Agent
    participant PR as PR Interface
    
    Dev->>GH: Push to PR branch
    GH->>GH: Trigger workflows
    
    par Parallel Execution
        GH->>A1: Start (pull_request_target)
        GH->>A2: Start (pull_request_target)
        GH->>A3: Start (pull_request_target)
        GH->>A4: Start (pull_request_target)
    end
    
    par Independent Data Fetching
        A1->>GH: GET /pulls/:id (mergeable state)
        A2->>GH: GET /pulls/:id/files
        A3->>GH: GET /pulls/:id/files
        A4->>GH: GET /pulls/:id
    end
    
    Note over A1: ~10 seconds
    A1->>PR: Post conflict status
    A1->>PR: Add labels
    A1->>PR: Create check run
    
    Note over A2: ~60 seconds
    A2->>PR: Post conflict resolutions
    
    Note over A3: ~120 seconds
    A3->>PR: Post inline security fixes
    A3->>PR: Post security summary
    
    Note over A4: ~180 seconds
    A4->>PR: Post CI/CD results
    A4->>PR: Post test suggestions
    
    Dev->>PR: View all agent outputs
```

---

## Agent Interaction Matrix

| Agent | Reads From | Writes To | Depends On | Coordinates With |
|-------|-----------|-----------|------------|------------------|
| **Conflict Status** | GitHub API<br/>PR metadata | Labels<br/>Check runs<br/>Comments | None | None (fastest) |
| **Merge Bot** | GitHub API<br/>Git repository<br/>Conflict markers | PR Comments<br/>(collapsible sections) | None | Conflict Status (implicit via labels) |
| **Security Bot** | GitHub API<br/>PR files list<br/>Vulnerability DB | Review comments<br/>PR comments<br/>Inline suggestions | None | None |
| **CI/CD Pipeline** | GitHub API<br/>Source code<br/>Dependencies | Review comments<br/>PR comments<br/>Check runs | Build job → Other jobs | None |

---

## Agent Responsibilities & Handoffs

### Agent Responsibility Breakdown

```mermaid
graph LR
    subgraph "Conflict Status Agent"
        A1[Detect Conflicts<br/>via API]
        A2[Add Labels]
        A3[Post Quick Status]
    end
    
    subgraph "Merge Bot Agent"
        B1[Parse Conflict<br/>Markers]
        B2[Analyze Both<br/>Versions]
        B3[Suggest Resolution<br/>Strategy]
    end
    
    subgraph "Security Bot Agent"
        C1[Get PR Files]
        C2[Filter Vulnerabilities]
        C3[Post Inline Fixes]
        C4[Summarize Issues]
    end
    
    subgraph "CI/CD Agent"
        D1[Build & Test]
        D2[Run Security Audit]
        D3[Check Quality]
        D4[Post Results]
    end
    
    A1 --> A2
    A2 --> A3
    
    B1 --> B2
    B2 --> B3
    
    C1 --> C2
    C2 --> C3
    C3 --> C4
    
    D1 --> D2
    D2 --> D3
    D3 --> D4
    
    style A1 fill:#e1f5fe
    style B1 fill:#fff3e0
    style C1 fill:#f3e5f5
    style D1 fill:#e8f5e9
```

### Implicit Coordination (No Direct Communication)

**Scenario 1: Conflict Detection Handoff**

```
Conflict Status (10s) → Detects conflicts → Adds "merge-conflict" label
                                              ↓
Merge Bot (60s) → Reads same PR → Finds conflicts → Posts detailed resolution
                                              ↓
Developer → Sees both: Quick status + Detailed suggestions
```

**Scenario 2: Security Analysis Handoff**

```
Security Bot (120s) → Scans 5 files in PR → Posts 3 inline fixes
                                              ↓
CI/CD Agent (180s) → Scans same 5 files → Posts 2 additional suggestions
                                              ↓
Developer → Sees combined: Security fixes + Quality improvements
```

---

## Data Flow & Shared Resources

### Shared Data Sources (Read-Only)

```mermaid
graph TD
    subgraph "GitHub REST API Endpoints"
        API1[GET /pulls/:id<br/>PR metadata]
        API2[GET /pulls/:id/files<br/>Changed files]
        API3[GET /pulls/:id/commits<br/>Commit history]
    end
    
    subgraph "Git Repository"
        GIT1[HEAD ref<br/>Feature branch]
        GIT2[Base ref<br/>Main branch]
        GIT3[Conflict markers<br/>Merge test]
    end
    
    subgraph "Agent Data Access"
        A1[Conflict Status]
        A2[Merge Bot]
        A3[Security Bot]
        A4[CI/CD]
    end
    
    A1 --> API1
    A2 --> API1
    A2 --> API2
    A2 --> GIT1
    A2 --> GIT2
    A2 --> GIT3
    A3 --> API2
    A3 --> GIT1
    A4 --> API1
    A4 --> API2
    A4 --> GIT1
```

### Output Destinations (Write-Only)

```mermaid
graph LR
    subgraph "Agents"
        A1[Conflict Status]
        A2[Merge Bot]
        A3[Security Bot]
        A4[CI/CD]
    end
    
    subgraph "GitHub PR Artifacts"
        O1[Labels]
        O2[Check Runs]
        O3[PR Comments]
        O4[Review Comments<br/>Inline]
    end
    
    A1 --> O1
    A1 --> O2
    A1 --> O3
    A2 --> O3
    A3 --> O3
    A3 --> O4
    A4 --> O3
    A4 --> O4
    
    style O1 fill:#ffeb3b
    style O2 fill:#ff9800
    style O3 fill:#4caf50
    style O4 fill:#2196f3
```

---

## Agent State Machine

### Conflict Status Agent State Machine

```mermaid
stateDiagram-v2
    [*] --> CheckAPI: Workflow triggered
    CheckAPI --> HasConflicts: mergeable = false
    CheckAPI --> NoConflicts: mergeable = true
    
    HasConflicts --> AddLabels: Add merge-conflict
    AddLabels --> CreateCheck: Create check run
    CreateCheck --> PostComment: Post status
    PostComment --> [*]
    
    NoConflicts --> RemoveLabels: Remove labels
    RemoveLabels --> DeleteComments: Clean up
    DeleteComments --> [*]
```

### Merge Bot Agent State Machine

```mermaid
stateDiagram-v2
    [*] --> CheckAPI: Workflow triggered
    CheckAPI --> TestMerge: Attempt git merge
    TestMerge --> ParseConflicts: Conflicts found
    TestMerge --> NoAction: No conflicts
    
    ParseConflicts --> AnalyzeConflict: For each file
    AnalyzeConflict --> DetermineStrategy: Check patterns
    
    DetermineStrategy --> AcceptCurrent: Keep feature
    DetermineStrategy --> AcceptBase: Keep main
    DetermineStrategy --> MergeBoth: Combine
    DetermineStrategy --> Regenerate: Lock files
    DetermineStrategy --> Manual: Complex
    
    AcceptCurrent --> PostResolution
    AcceptBase --> PostResolution
    MergeBoth --> PostResolution
    Regenerate --> PostResolution
    Manual --> PostResolution
    
    PostResolution --> [*]
    NoAction --> [*]
```

### Security Bot Agent State Machine

```mermaid
stateDiagram-v2
    [*] --> FetchFiles: Get PR files
    FetchFiles --> FilterVulns: Match against DB
    FilterVulns --> HasVulns: Vulnerabilities found
    FilterVulns --> NoVulns: Clean PR
    
    HasVulns --> PostInline: Create review comments
    PostInline --> BuildTable: Build summary table
    BuildTable --> PostSummary: Post comment
    PostSummary --> AddLabels: Add security-review
    AddLabels --> [*]
    
    NoVulns --> PostClean: Post clean status
    PostClean --> [*]
```

### CI/CD Agent State Machine

```mermaid
stateDiagram-v2
    [*] --> Build: Install & build
    Build --> BuildSuccess: Success
    Build --> BuildFail: Failure
    
    BuildSuccess --> ParallelJobs: Fork execution
    ParallelJobs --> Test
    ParallelJobs --> Security
    ParallelJobs --> Quality
    
    Test --> PostSuggestions
    Security --> PostSuggestions
    Quality --> PostSuggestions
    
    PostSuggestions --> Summary: Aggregate results
    Summary --> [*]
    
    BuildFail --> FailPipeline: Block PR
    FailPipeline --> [*]
```

---

## Timing & Priority Orchestration

### Agent Execution Timeline

```
Time  | Agent                  | Action                                    | User Visibility
------|------------------------|-------------------------------------------|------------------
0s    | GitHub                 | PR event triggers all 4 workflows         | Loading...
1s    | All Agents             | Checkout code, setup environment          | Loading...
5s    | Conflict Status        | API check complete                        | 
10s   | ✅ Conflict Status      | Comment posted, labels added              | "🔍 Detecting..."
20s   | Merge Bot              | Git merge test complete                   |
30s   | Security Bot           | Files fetched, vulnerabilities filtered   |
40s   | CI/CD                  | Dependencies installed                    |
60s   | ✅ Merge Bot            | Conflict resolutions posted               | "🔀 Conflicts found"
90s   | CI/CD                  | Build complete, tests running             |
120s  | ✅ Security Bot         | Security analysis posted                  | "🛡️ 5 issues found"
150s  | CI/CD                  | Security scan complete                    |
180s  | ✅ CI/CD                | All jobs complete, summary posted         | "✅ Build passed"
```

### Priority Levels

| Priority | Agent | Reason | Target Time |
|----------|-------|--------|-------------|
| **IMMEDIATE** | Conflict Status | Developers need to know about conflicts ASAP | 10s |
| **HIGH** | Merge Bot | Detailed conflict resolution is critical | 60s |
| **HIGH** | Security Bot | Security issues should block unsafe merges | 120s |
| **MEDIUM** | CI/CD | Comprehensive testing takes time | 180s |

---

## Agent Communication via Shared Context

### GitHub PR as Shared Blackboard

Agents use the PR as a "blackboard" - a shared space where they write information that others can read:

```mermaid
graph TB
    subgraph "Shared Blackboard GitHub PR"
        PR[Pull Request #21]
        
        subgraph "Written by Conflict Status"
            L1[Labels: merge-conflict]
            C1[Check Run: Conflicts]
        end
        
        subgraph "Written by Merge Bot"
            C2[Comment: Resolutions]
        end
        
        subgraph "Written by Security Bot"
            C3[Comment: Summary]
            R1[Review: Inline fixes]
        end
        
        subgraph "Written by CI/CD"
            C4[Comment: Build results]
            R2[Review: Test suggestions]
        end
    end
    
    A1[Conflict Status] --> L1
    A1 --> C1
    A2[Merge Bot] --> C2
    A3[Security Bot] --> C3
    A3 --> R1
    A4[CI/CD] --> C4
    A4 --> R2
    
    Dev[Developer] --> PR
    PR --> Dev
    
    style PR fill:#ffd54f
```

### Example: Implicit Agent Coordination

**Scenario: PR with security vulnerabilities in conflicted file**

```mermaid
sequenceDiagram
    participant Dev
    participant GH as GitHub
    participant A1 as Conflict Status
    participant A2 as Merge Bot
    participant A3 as Security Bot
    
    Dev->>GH: Push PR with srv/config.js conflict
    
    par All agents start
        GH->>A1: Trigger
        GH->>A2: Trigger
        GH->>A3: Trigger
    end
    
    Note over A1: 10 seconds
    A1->>GH: Add label "merge-conflict"
    A1->>GH: Post "⚠️ Conflicts detected"
    
    Note over A2: 60 seconds
    A2->>GH: GET /pulls/:id/files
    Note over A2: Sees srv/config.js in PR
    A2->>GH: Checkout & test merge
    Note over A2: Finds conflict in srv/config.js
    A2->>GH: Post "Use environment variables"
    
    Note over A3: 120 seconds
    A3->>GH: GET /pulls/:id/files
    Note over A3: Sees srv/config.js in PR
    A3->>GH: Filter vulnerabilities
    Note over A3: Finds "Hardcoded Credentials"
    A3->>GH: Post inline fix on line 10-13
    A3->>GH: Post summary table
    
    Dev->>GH: View PR
    Note over Dev: Sees:<br/>1. Conflict label<br/>2. Resolution suggestion<br/>3. Security fix<br/>All for same file!
```

---

## Agent Data Processing Pipeline

### Each Agent's Internal Pipeline

```mermaid
graph LR
    subgraph "Conflict Status Agent Pipeline"
        CS1[Input: PR event] --> CS2[Fetch: PR metadata]
        CS2 --> CS3[Process: Check mergeable]
        CS3 --> CS4[Output: Labels + Comment]
    end
    
    subgraph "Merge Bot Agent Pipeline"
        MB1[Input: PR event] --> MB2[Fetch: PR files + Git]
        MB2 --> MB3[Process: Parse conflicts]
        MB3 --> MB4[Output: Resolution comment]
    end
    
    subgraph "Security Bot Agent Pipeline"
        SB1[Input: PR event] --> SB2[Fetch: PR files]
        SB2 --> SB3[Process: Filter vulns]
        SB3 --> SB4[Output: Inline + Summary]
    end
    
    subgraph "CI/CD Agent Pipeline"
        CD1[Input: PR event] --> CD2[Fetch: Source code]
        CD2 --> CD3[Process: Build + Test]
        CD3 --> CD4[Output: Results comment]
    end
    
    style CS1 fill:#e1f5fe
    style MB1 fill:#fff3e0
    style SB1 fill:#f3e5f5
    style CD1 fill:#e8f5e9
```

---

## Decision Trees for Agent Actions

### Conflict Status Agent Decision Tree

```mermaid
graph TD
    A[PR Event] --> B{Check mergeable_state}
    B -->|dirty| C[Has Conflicts]
    B -->|clean| D[No Conflicts]
    B -->|unknown| E[Wait & Retry]
    
    C --> F[Add merge-conflict label]
    F --> G[Add needs-resolution label]
    G --> H[Create check: action_required]
    H --> I[Post conflict status comment]
    
    D --> J[Remove conflict labels]
    J --> K[Delete old comments]
    K --> L[Exit clean]
    
    E --> B
```

### Merge Bot Resolution Strategy Decision Tree

```mermaid
graph TD
    A[Conflict Detected] --> B{File Type?}
    
    B -->|Lock file| C[Strategy: Regenerate]
    B -->|Config file| D{Content Check}
    B -->|Workflow| E[Strategy: Accept Base]
    B -->|Code file| F{Change Type}
    
    D -->|Hardcoded creds| G[Strategy: Merge Config<br/>Use env vars]
    D -->|Regular config| H[Strategy: Manual Review]
    
    F -->|Imports| I[Strategy: Merge Both]
    F -->|Logic changes| J[Strategy: Manual Review]
    F -->|Identical| K[Strategy: Accept Either]
    
    C --> L[Post: rm package-lock.json<br/>npm install]
    G --> M[Post: Use process.env]
    E --> N[Post: Accept main branch]
    I --> O[Post: Combine imports]
    J --> P[Post: Review needed]
    H --> P
    K --> Q[Post: Accept current]
```

### Security Bot Filtering Decision Tree

```mermaid
graph TD
    A[All Vulnerabilities DB<br/>9 total] --> B[Get PR Files]
    B --> C{For each vulnerability}
    
    C --> D{File in PR?}
    D -->|Yes| E[Include in report]
    D -->|No| F[Skip]
    
    E --> G{Severity}
    G -->|Critical| H[Post inline + Table]
    G -->|High| H
    G -->|Medium| I[Post inline only]
    
    H --> J[Count totals]
    I --> J
    F --> C
    
    J --> K{Any vulns?}
    K -->|Yes| L[Status: Failed<br/>Post summary]
    K -->|No| M[Status: Passed<br/>Post clean]
```

---

## Agent Output Aggregation

### How Outputs Combine in PR UI

```mermaid
graph TB
    subgraph "GitHub PR Interface"
        subgraph "Conversation Tab"
            C1[Comment: Conflict Status]
            C2[Comment: Merge Resolutions]
            C3[Comment: Security Summary]
            C4[Comment: CI/CD Results]
        end
        
        subgraph "Files Changed Tab"
            F1[Review: Security inline fixes]
            F2[Review: Test suggestions]
        end
        
        subgraph "Checks Tab"
            CH1[Check: Conflict Status]
            CH2[Check: Build]
            CH3[Check: Tests]
            CH4[Check: Security Scan]
        end
        
        subgraph "Labels Sidebar"
            L1[merge-conflict]
            L2[needs-resolution]
            L3[security-review]
            L4[pro-analyzed]
        end
    end
    
    A1[Conflict Status] --> C1
    A1 --> CH1
    A1 --> L1
    A1 --> L2
    
    A2[Merge Bot] --> C2
    
    A3[Security Bot] --> C3
    A3 --> F1
    A3 --> L3
    
    A4[CI/CD] --> C4
    A4 --> CH2
    A4 --> CH3
    A4 --> CH4
    A4 --> F2
    A4 --> L4
    
    style C1 fill:#e1f5fe
    style C2 fill:#fff3e0
    style C3 fill:#f3e5f5
    style C4 fill:#e8f5e9
```

---

## Error Handling & Resilience

### Agent Failure Scenarios

```mermaid
graph TD
    A[Agent Execution] --> B{Error Occurs?}
    
    B -->|No| C[Complete Successfully]
    B -->|Yes| D{Error Type}
    
    D -->|API Rate Limit| E[Retry with backoff]
    D -->|Permission Denied| F[Log & Skip]
    D -->|Timeout| G[Continue partial]
    D -->|Network Error| E
    
    E --> H{Retry Success?}
    H -->|Yes| C
    H -->|No| I[Log & Continue]
    
    F --> I
    G --> I
    I --> J[Post Partial Results]
    
    C --> K[Post Full Results]
    K --> L[Other Agents Continue]
    J --> L
```

**Key Principle**: One agent failure does NOT affect other agents

Example:
```
Security Bot fails → ❌ No security analysis posted
                    → ✅ Conflict Status still works
                    → ✅ Merge Bot still works
                    → ✅ CI/CD still works
```

---

## Agent Interaction Summary

### Communication Model: **Shared Nothing, Coordinated Timing**

| Aspect | Implementation |
|--------|----------------|
| **Direct Communication** | ❌ None - agents don't call each other |
| **Shared Memory** | ❌ None - no shared state |
| **Shared Data Sources** | ✅ GitHub API, Git repo |
| **Shared Output Space** | ✅ PR comments, labels, checks |
| **Coordination** | ✅ Via timing and priorities |
| **Failure Isolation** | ✅ One failure doesn't affect others |

### Why This Architecture?

✅ **Resilience**: One agent failure doesn't cascade  
✅ **Scalability**: Add new agents without modifying existing ones  
✅ **Simplicity**: No complex orchestration logic  
✅ **Performance**: Parallel execution for speed  
✅ **Testability**: Each agent can be tested independently  

---

## Future Agent Interactions

### Potential Future Enhancements

```mermaid
graph LR
    subgraph "Current: Independent"
        A1[Conflict<br/>Status]
        A2[Merge<br/>Bot]
        A3[Security<br/>Bot]
        A4[CI/CD]
    end
    
    subgraph "Future: Event-Driven"
        B1[Event Bus]
        B2[Agent Registry]
        B3[Shared Context Store]
    end
    
    A1 -.->|Could publish| B1
    A2 -.->|Could publish| B1
    A3 -.->|Could subscribe| B1
    A4 -.->|Could subscribe| B1
    
    B1 -.->|Events| B2
    B2 -.->|State| B3
```

**Possible Future Patterns**:
- Event-driven: Agents publish/subscribe to events
- Shared state: Centralized context store
- Agent chaining: Output of one feeds into another
- Dynamic agents: Spawn agents based on PR content

---

## Conclusion

PRo uses a **decentralized, parallel agent architecture** where:

1. **No Direct Communication**: Agents operate independently
2. **Shared Data Sources**: All read from GitHub API and Git
3. **Shared Output Space**: All write to PR UI
4. **Timing Coordination**: Fast agents run first, slow agents run last
5. **Failure Isolation**: One agent failure doesn't affect others

This creates a **resilient, scalable, and performant** PR analysis system that provides comprehensive feedback while maintaining simplicity.

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-16  
**Related Docs**: [PRO_WORKFLOW_ARCHITECTURE.md](./PRO_WORKFLOW_ARCHITECTURE.md)
