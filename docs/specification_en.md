# Network Simulator Specification Document

**Version:** 1.0
**Last Updated:** 2026-03-31

---

## 1. Overview

This application is a Cisco IOS-style network simulator that runs in a web browser. It provides drag-and-drop network topology design, CLI-based device configuration, and real-time packet flow visualization.

### 1.1 Purpose

- Provide a learning and practice environment for network configuration
- Support Cisco IOS command syntax training
- Enable understanding of routing, NAT, firewall, and VLAN operations

### 1.2 System Requirements

| Item | Requirement |
|------|-------------|
| Browser | Modern browser with ES Modules support (Chrome, Firefox, Edge, etc.) |
| Server | Not required (runs from local files or any static web server) |
| Dependencies | None (pure HTML/CSS/JavaScript) |

---

## 2. System Architecture

### 2.1 File Structure

```
NW/
├── index.html              # Entry point (HTML)
├── main.css                # Stylesheet (dark theme)
├── main.js                 # Application initialization
├── Store.js                # Centralized state management
├── EventBus.js             # Pub/Sub event system
├── Topology.js             # Device/link data models and factories
├── CLIEngine.js            # Command parser and mode dispatcher
├── CommandRegistry.js      # Command tree and hint data structure
├── TabComplete.js          # Tab completion engine
├── Abbreviations.js        # Command abbreviation expansion
├── PingEngine.js           # Ping/Traceroute execution engine
├── Routing.js              # Routing, NAT, and firewall logic
├── NetworkUtils.js         # IP address utilities
├── Terminal.js             # Terminal display
├── DeviceTabs.js           # Device tab switcher
├── CommandHints.js         # Command hints display
├── VlanLegend.js           # VLAN legend display
├── Toast.js                # Toast notifications
├── CanvasRenderer.js       # Canvas rendering orchestrator
├── DeviceRenderer.js       # Device icon rendering
├── LinkRenderer.js         # Link rendering
├── DesignController.js     # Design mode canvas interactions
├── DevicePalette.js        # Device palette
├── InterfacePicker.js      # Interface selection dialog
├── ContextMenu.js          # Right-click context menus
├── LocalStorage.js         # Browser storage persistence
└── Snapshot.js             # Serialization/deserialization
```

### 2.2 Architecture Patterns

- **Event-driven design:** Loosely coupled components communicate via EventBus (Pub/Sub)
- **Centralized state management:** Store manages all state (devices, links, CLI mode, command history)
- **Modular structure:** ES Modules for file-level separation by functionality

---

## 3. Device Specifications

### 3.1 Supported Device Types

| Device | Abbreviation | Interfaces | Key Features |
|--------|-------------|------------|--------------|
| **Router** | R1, R2, ... | GigabitEthernet0/0–0/3 | Static routing, NAT, standard/extended ACLs |
| **Switch** | SW1, SW2, ... | FastEthernet0/1–0/24 | VLANs, access/trunk ports |
| **Firewall** | FW1, FW2, ... | GigabitEthernet0/0–0/3 | Firewall policies, NAT, standard/extended ACLs |
| **Server** | SV1, SV2, ... | Ethernet0– (multiple) | Multiple interfaces, static routing, default gateway |
| **PC** | PC1, PC2, ... | Ethernet0 | Single interface, default gateway |

### 3.2 Device Data Model

```
Device {
  type: 'router' | 'switch' | 'pc' | 'firewall'
  hostname: string
  x, y: number (canvas coordinates)

  interfaces: {
    [name]: {
      ip: string | null
      mask: string | null
      status: 'up' | 'down'
      protocol: 'up' | 'down'
      description: string
      connected: { device, iface } | null
      natRole: 'inside' | 'outside' | null
      accessGroup: { in: number | null, out: number | null }  // R/FW only
      switchport: { mode, accessVlan, trunkAllowed }  // switch only
    }
  }

  routes: [{ network, mask, nextHop }]              // router/firewall/server
  nat: { staticEntries, pools, dynamicRules, translations, stats }
  accessLists: {
    [1-99]:   [{ action, network, wildcard }]                                            // standard ACL
    [100-199]: [{ action, protocol, src, srcWildcard, dst, dstWildcard, port }]          // extended ACL
  }
  policies: [{ seq, action, src, srcWildcard, dst, dstWildcard, protocol, port }]  // firewall only
  vlans: { [id]: { name } }                         // switch only
  defaultGateway: string | null                      // PC/server only
}
```

### 3.3 Link Data Model

```
Link {
  from: deviceId        # Source device
  fromIf: string        # Source interface name
  to: deviceId          # Destination device
  toIf: string          # Destination interface name
}
```

---

## 4. CLI Command Specifications

### 4.1 CLI Mode Transitions

```
User EXEC  ──enable──>  Privileged EXEC  ──configure terminal──>  Global Config
                                                                       │
                                                       interface <name>│
                                                                       v
                                                              Interface Config

Global Config  ──vlan <id>──>  VLAN Config (switch only)

exit: return one level up / end: return to Privileged EXEC
```

### 4.2 Command Reference

#### 4.2.1 Mode Navigation Commands

| Command | Abbreviation | Action |
|---------|-------------|--------|
| `enable` | `en` | Enter Privileged EXEC mode |
| `configure terminal` | `conf t` | Enter Global Config mode |
| `interface <name>` | `int <name>` | Enter Interface Config mode |
| `vlan <id>` | - | Enter VLAN Config mode (switch only) |
| `exit` | - | Return one level up |
| `end` | - | Return to Privileged EXEC |

#### 4.2.2 Interface Configuration Commands

| Command | Action | Applicable Devices |
|---------|--------|-------------------|
| `ip address <ip> <mask>` | Set IP address and subnet mask | R, FW, PC |
| `no shutdown` | Enable the interface | All |
| `shutdown` | Disable the interface | All |
| `description <text>` | Set interface description | All |
| `ip nat inside` | Designate as NAT inside interface | R, FW |
| `ip nat outside` | Designate as NAT outside interface | R, FW |
| `ip access-group <acl-num> in\|out` | Apply ACL to interface | R, FW |
| `no ip access-group <acl-num> in\|out` | Remove ACL from interface | R, FW |
| `switchport mode access` | Set as access port | SW |
| `switchport mode trunk` | Set as trunk port | SW |
| `switchport access vlan <id>` | Assign access VLAN | SW |
| `switchport trunk allowed vlan <list>` | Configure allowed trunk VLANs | SW |

#### 4.2.3 Routing Commands

| Command | Action | Applicable Devices |
|---------|--------|-------------------|
| `ip route <network> <mask> <next-hop>` | Add static route | R, FW, SV |
| `no ip route <network> <mask> <next-hop>` | Delete static route | R, FW, SV |
| `ip default-gateway <ip>` | Set default gateway | PC, SV |

#### 4.2.4 NAT Commands

| Command | Action |
|---------|--------|
| `ip nat inside source static <local-ip> <global-ip>` | Add static NAT entry |
| `ip nat pool <name> <start-ip> <end-ip> netmask <mask>` | Define NAT pool |
| `ip nat inside source list <acl-num> pool <name>` | Configure dynamic NAT rule (uses standard ACL) |

#### 4.2.5 ACL Commands (R/FW)

##### Standard ACLs (Numbers 1–99)

Filter by source IP address only. Also used for NAT condition matching.

| Command | Action |
|---------|--------|
| `access-list <1-99> permit\|deny <network> [wildcard]` | Add standard ACL entry |
| `no access-list <num>` | Delete entire ACL |

##### Extended ACLs (Numbers 100–199)

Filter by source IP, destination IP, protocol, and port number.

| Command | Action |
|---------|--------|
| `access-list <100-199> permit\|deny <proto> <src> <srcWC> <dst> <dstWC> [eq <port>]` | Add extended ACL entry |
| `no access-list <num>` | Delete entire ACL |

- `proto`: `ip`, `tcp`, `udp`, `icmp`
- `src`/`dst`: IP address + wildcard mask, `any` (all addresses), or `host <ip>` (single host)
- `eq <port>`: Specify TCP/UDP port number (optional, 1–65535)
- Implicit **deny all** exists at the end of every ACL

##### Standard vs Extended ACL Comparison

| Feature | Standard ACL (1-99) | Extended ACL (100-199) |
|---------|-------------------|----------------------|
| Source IP | Match | Match |
| Destination IP | - | Match |
| Protocol | - | ip/tcp/udp/icmp |
| Port Number | - | eq (tcp/udp) |
| Primary Use | NAT conditions, basic filtering | Detailed traffic filtering |

##### Applying ACLs to Interfaces

ACLs are applied inbound (in) or outbound (out) on an interface.

```
interface GigabitEthernet0/0
  ip access-group <acl-num> in       # Apply ACL to incoming packets
  ip access-group <acl-num> out      # Apply ACL to outgoing packets
```

#### 4.2.6 Firewall Commands (Firewall Only)

| Command | Action |
|---------|--------|
| `firewall policy <seq> permit\|deny <src> <srcWC> <dst> <dstWC> <proto> [port]` | Add firewall policy |
| `no firewall policy <seq>\|all` | Remove policy |

- `src`/`dst`: IP address + wildcard mask, or `any`
- `proto`: `ip`, `tcp`, `udp`, `icmp`
- Implicit "deny all" exists at end of policy list

#### 4.2.7 VLAN Commands (Switch Only)

| Command | Action |
|---------|--------|
| `vlan <id>` | Create VLAN and enter VLAN Config |
| `name <vlan-name>` | Set VLAN name |
| `no vlan <id>` | Delete VLAN |

#### 4.2.8 Show Commands

| Command | Description |
|---------|------------|
| `show ip interface brief` | Interface summary (IP, status) |
| `show running-config` | Full device configuration |
| `show interfaces` | Detailed interface information |
| `show ip route` | Routing table |
| `show ip nat translations` | NAT translation table |
| `show ip nat statistics` | NAT statistics |
| `show firewall policy` | Firewall policy list |
| `show access-lists` | ACL list (entries and applied interfaces) |
| `show arp` | ARP table |
| `show packet-flow <ip>` | Detailed packet flow diagnostics (includes ACL checks) |
| `show vlan brief` | VLAN summary (switch only) |
| `show interfaces trunk` | Trunk port information (switch only) |
| `show interfaces switchport` | Switchport configuration (switch only) |

#### 4.2.9 Diagnostic Commands

| Command | Action |
|---------|--------|
| `ping <ip>` | Test connectivity to IP (with animation) |
| `traceroute <ip>` | Trace route hop-by-hop |
| `clear arp` | Clear ARP cache |

---

## 5. Simulation Engine Specifications

### 5.1 Routing Algorithm

1. **Directly connected networks**: Check if destination IP is on the same subnet as an interface
2. **Longest prefix match**: Select the static route with the longest CIDR (most specific match)
3. **PC routing**: Check directly connected first, then use default gateway

### 5.2 L2 Switching

- **BFS (Breadth-First Search)**: Path discovery through switch fabric
- **VLAN constraints**: Respects access port VLAN tags and trunk port allowed VLAN lists
- If VLANs don't match along the path, the destination is deemed unreachable

### 5.3 NAT Processing

| Direction | Processing Order |
|-----------|-----------------|
| **Outside → Inside** | Search translation table, reverse-translate global IP to local IP |
| **Inside → Outside** | (1) Check static NAT → (2) Dynamic NAT (ACL + pool allocation) |

- **Pool allocation**: Round-robin from available IPs
- **Statistics**: Tracks hit/miss counts

### 5.4 ACL Filtering

ACLs are applied per-interface in the `in` (inbound) or `out` (outbound) direction.

**Evaluation order:**
1. Entries are evaluated top-to-bottom in definition order
2. The first matching entry's `permit`/`deny` action is applied
3. If no entry matches, implicit **deny all**

**Matching logic:**
- **Standard ACL**: Compares source IP only using wildcard mask
- **Extended ACL**: Compares source IP, destination IP, and protocol (ip/tcp/udp/icmp). Port matching applies only when `eq` is specified

**ACL check order in packet processing:**
1. Packet arrives at interface → **inbound ACL** check
2. NAT translation applied
3. Firewall policy check (firewall only)
4. Routing lookup
5. Egress interface determined → **outbound ACL** check
6. Packet forwarded

### 5.5 Firewall Filtering

1. Policies evaluated in ascending sequence number order
2. Wildcard mask IP matching: `(IP & ~wildcard) === (network & ~wildcard)`
3. First matching rule's `permit`/`deny` action is applied
4. If no rule matches, implicit **deny all**

### 5.6 Packet Path Construction

1. Resolve routing hop-by-hop from source to destination
2. Check inbound ACL on each router/firewall ingress interface
3. Apply NAT translation at each router/firewall
4. Perform firewall policy checks at each firewall device
5. Check outbound ACL on egress interface
6. Use VLAN-aware BFS for switch fabric traversal
7. Loop detection (visited set) prevents infinite loops

### 5.7 Packet Flow Diagnostics

The `show packet-flow <ip>` command displays detailed decisions at each hop:

- Ingress interface
- Local check (is destination on this device?)
- **ACL check (inbound: ingress interface ACL permit/deny)**
- NAT translation (before/after IPs)
- Firewall check (policy permit/deny)
- Routing lookup (selected route and next-hop)
- **ACL check (outbound: egress interface ACL permit/deny)**
- Egress interface
- L2 switching (VLAN-aware forwarding)

---

## 6. UI Specifications

### 6.1 Screen Layout

```
┌─── Header ────────────────────────────────────────────────┐
│ Title | Device Tabs | Toolbar (Save/Load/Export/etc.)      │
├───────────────────────────────────────────────────────────┤
│                    │                │                      │
│   Canvas           │  Design        │   Terminal           │
│  (Topology         │  Palette       │                      │
│   Diagram)         │  (in design    │   Output Area        │
│                    │   mode)        │   Hints Panel        │
│                    │               │   Input Prompt        │
│                    │               │                      │
└────────────────────┴───────────────┴──────────────────────┘
```

### 6.2 Canvas Display

- **Device icons**: Unique shapes per device type
- **Links**: Lines connecting devices, color-coded by VLAN
- **Status colors**: Green = UP, Red = DOWN, Gray = Unconfigured, Purple = Trunk
- **Packet animation**: Visual packet movement during ping/traceroute

### 6.3 Terminal

- **Color output**: Commands (cyan), success (green), errors (red)
- **Tab completion**: Auto-complete commands with Tab key
- **Command history**: Navigate history with up/down arrow keys
- **Command hints**: Real-time suggestions based on current input

---

## 7. Data Persistence Specifications

### 7.1 Storage Methods

| Method | Description |
|--------|-------------|
| **Auto-save** | Automatically saves to browser localStorage on configuration changes |
| **Manual save** | Saves to localStorage with timestamp |
| **Export** | Downloads configuration as JSON file |
| **Import** | Loads configuration from JSON file |
| **Reset** | Restores to initial state with confirmation dialog |

### 7.2 Data Format

JSON format containing:
- All device configurations (IP addresses, routing, NAT, ACLs, VLANs, firewall policies, etc.)
- All link connection information
- Device canvas positions

---

## 8. Limitations and Differences from Real Equipment

| Feature | This Simulator | Real Cisco IOS |
|---------|---------------|----------------|
| IP Version | IPv4 only | IPv4/IPv6 |
| Routing Protocols | Static routes only | OSPF, BGP, EIGRP, etc. |
| Firewall | Stateless (no connection tracking) | Stateful |
| L2 Protocols | VLANs, basic switching | STP, LACP, LLDP, etc. |
| NAT | Static, dynamic (basic) | PAT, NAT-T, advanced features |
| ACLs | Standard ACLs (1-99), Extended ACLs (100-199) | Standard/extended/named ACLs |
| QoS | None | Various QoS features |
| Spanning Tree | None (no loop prevention) | STP/RSTP/MSTP |
