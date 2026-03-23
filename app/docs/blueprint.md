# **App Name**: PowerPlay

## Core Features:

- User Authentication and Roles: Secure user authentication (email/Google) with role-based access control (admin, technician, viewer) via Firebase Authentication.
- Event Management: Create, manage, and share events with role-based permissions (owner, shared with).
- Device Catalog: Maintain a catalog of devices with technical specifications (power, current, weight, IP rating, etc.).
- Location Management: Define and manage event locations with address details.
- Real-time Power Calculation and Validation: Dynamically calculate total power (W), current (A), and weight (kg) for each event based on assigned devices, using LLM as a tool. Validate against connector limits and prevent saving if limits are exceeded.
- Power Connector Management: Manage power connectors at each location with type, phases, and max current specifications.
- Event Summary: Generate summary reports to a file. Placeholder implementation, but include button.

## Style Guidelines:

- Primary color: Electric blue (#7DF9FF) for a modern, tech-focused aesthetic, suggesting precision and energy.
- Background color: Dark slate gray (#2E3A40) to reduce eye strain in low-light environments, common in technical event settings. 
- Accent color: Yellow-green (#B0FF1A) to draw attention to critical alerts, power levels, and actionable items within the interface.
- Body and headline font: 'Inter', a grotesque-style sans-serif, for a modern and objective feel. Suitable for UI and legibility.
- Use clear, concise icons representing devices, power, location, and user roles.
- Mobile-first, responsive layout with clear sections for event list, device details, and power connector management.
- Subtle animations for data updates, validation alerts, and interactive elements.