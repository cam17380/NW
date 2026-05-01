# Network Simulator Specification Document

**Version:** 1.5.1
**Last Updated:** 2026-05-01

---

## 1. Overview

This application is a Cisco IOS-style network simulator that runs in a web browser. It provides drag-and-drop network topology design, CLI-based device configuration, and real-time packet flow visualization.

### 1.1 Purpose

- Provide a learning and practice environment for network configuration
- Support Cisco IOS command syntax training
- Enable understanding of routing, NAT, firewall, and VLAN operations
- Understand automatic route learning via **OSPF dynamic routing**
- Understand DHCP server/client operation
- Learn inter-VLAN routing via L3 switches (SVI)
- Understand link redundancy with LACP/Bond
- Learn site-to-site connectivity via IPsec VPN tunnels
- Understand firewall NAT/policy processing order
- Progressive learning via **Learn Mode** (tutorials) and **Challenge Mode** (exercises)

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
├── styles/
│   └── main.css            # Stylesheet (dark theme)
├── src/
│   ├── main.js             # Application initialization
│   ├── core/
│   │   ├── Store.js        # Centralized state management (incl. OSPF auto-recompute)
│   │   └── EventBus.js     # Pub/Sub event system
│   ├── model/
│   │   ├── Topology.js     # Device/link data models and factories
│   │   └── DeviceCapabilities.js # Per-type capability checks (l3Forwarding/vlan/nat/vpn/lag/...)
│   ├── cli/
│   │   ├── CLIEngine.js    # Command parser and mode dispatcher
│   │   ├── CommandRegistry.js # Command tree and hint data structure
│   │   ├── TabComplete.js  # Tab completion engine
│   │   ├── Abbreviations.js # Command abbreviation expansion
│   │   └── commands/
│   │       ├── ConfigCommands.js     # config-mode commands
│   │       ├── InterfaceCommands.js  # config-if-mode commands
│   │       ├── RouterOspfCommands.js # config-router-mode (OSPF) commands
│   │       └── ShowCommands.js       # all show commands
│   ├── simulation/
│   │   ├── PingEngine.js   # Ping/Traceroute/ARP resolution engine (incl. bond-aware)
│   │   ├── Routing.js      # Routing, NAT, firewall, L2 reachability, SVI, and bond logic
│   │   ├── OspfEngine.js   # OSPF neighbor discovery, route propagation, simplified LSDB
│   │   └── NetworkUtils.js # IP address utilities
│   ├── rendering/
│   │   ├── CanvasRenderer.js # Canvas rendering, animation, zoom/pan
│   │   ├── DeviceRenderer.js # Device icon rendering
│   │   └── LinkRenderer.js # Link rendering and edge point calculation
│   ├── ui/
│   │   ├── Terminal.js     # Terminal display
│   │   ├── DeviceTabs.js   # Device tab switcher
│   │   ├── CommandHints.js # Command hints display
│   │   ├── HelpRenderer.js # Help overlay generator
│   │   ├── Splitter.js     # Panel splitter
│   │   ├── TemplateSelector.js # Template selection UI
│   │   ├── VlanLegend.js   # VLAN legend display
│   │   └── Toast.js        # Toast notifications
│   ├── design/
│   │   ├── DesignController.js # Design mode canvas interactions (incl. pan support)
│   │   ├── DevicePalette.js # Device palette
│   │   ├── InterfacePicker.js # Interface selection dialog
│   │   └── ContextMenu.js  # Right-click context menus
│   ├── learn/              # Learn Mode (interactive tutorials)
│   │   ├── LearnEngine.js  # Step progression engine
│   │   ├── LearnUI.js      # Tutorial side panel
│   │   ├── LearnSelector.js # Lesson selection modal
│   │   ├── CanvasUtils.js  # Shared lesson rendering helpers
│   │   └── lessons/        # Individual lessons (IP, subnet, routing, OSPF, etc.)
│   ├── challenge/          # Challenge Mode (exercises)
│   │   ├── ChallengeEngine.js  # Objective tracking and check evaluation
│   │   ├── ChallengeUI.js      # Floating challenge panel
│   │   ├── ChallengeSelector.js # Scenario selection modal
│   │   └── scenarios/      # Beginner / intermediate / advanced scenarios
│   ├── i18n/               # Internationalization (JA/EN toggle)
│   │   ├── I18n.js         # Locale loader and string expansion
│   │   └── locales/        # JA/EN locales (common + challenge + learn + help)
│   └── persistence/
│       ├── LocalStorage.js # Browser storage persistence
│       ├── Snapshot.js     # Serialization/deserialization (incl. OSPF & bond state)
│       ├── Templates.js    # Network topology template data
│       └── ConfigExport.js # CLI command script generator (Cisco / YAMAHA)
```

### 2.2 Architecture Patterns

- **Event-driven design:** Loosely coupled components communicate via EventBus (Pub/Sub)
- **Centralized state management:** Store manages all state (devices, links, CLI mode, command history)
- **Modular structure:** ES Modules for file-level separation by functionality
- **Capability-based dispatch:** `DeviceCapabilities.hasCapability(dev, cap)` centralizes per-type branching (l3Forwarding/vlan/nat/vpn/lag/dhcpClient/...). Commands and UI gate features on capabilities rather than `device.type` checks
- **Three-way consistency rule:** Forwarding logic changes must be mirrored across `forwardPacket` (Routing.js), `buildPingPath` (PingEngine.js), and `tracePacketFlow` (PingEngine.js)
- **OSPF auto-recompute:** `Store.setTopology` calls `recomputeAllOspf` so all topology load paths (templates / snapshot restore / Open in Simulator) deliver populated route tables

---

## 3. Device Specifications

### 3.1 Supported Device Types

| Device | Abbreviation | Interfaces | Key Features |
|--------|-------------|------------|--------------|
| **Router** | R1, R2, ... | GigabitEthernet0/0–0/3 | Static routing, **OSPF**, NAT, standard/extended ACLs, **DHCP server**, IPsec VPN |
| **Switch** | SW1, SW2, ... | FastEthernet0/1–0/24 | VLANs, access/trunk ports, SVI (L3 switch capability) |
| **Firewall** | FW1, FW2, ... | GigabitEthernet0/0–0/3 | Firewall policies, **OSPF**, NAT, standard/extended ACLs |
| **Server** | SV1, SV2, ... | Ethernet0– (multiple) | Multiple interfaces, static routing, default gateway |
| **PC** | PC1, PC2, ... | Ethernet0 | Single interface, default gateway, **DHCP client** |

The capability map is defined in `src/model/DeviceCapabilities.js`. Examples:
- `l3Forwarding`: router / firewall / L3 switch (switch with SVI)
- `nat`: router / firewall
- `vpn`: router / firewall
- `vlan`: switch
- `lag`: server / pc (active-backup)
- `dhcpClient`: pc
- `defaultGateway`: pc / server

### 3.2 Device Data Model

```
Device {
  type: 'router' | 'switch' | 'pc' | 'firewall' | 'server'
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
      bondGroup: string | null                         // Bond group name (LACP/active-backup)
      tunnel: { source, destination, mode }            // tunnel IF (VPN) only
    }
  }

  routes: [{ network, mask, nextHop }]              // router/firewall/server/L3 switch
  ospf: {                                            // router/firewall (OSPF config)
    processes: { [pid]: { networks: [{ ip, wildcard, area }] } }
    routerId: string | null                          // Manual router ID
  }
  ospfRoutes: [{ network, mask, nextHop, type: 'ospf' }]  // OSPF-learned routes (auto-populated)
  crypto: { isakmpPolicies, transformSets, cryptoMaps }  // router (VPN) only
  nat: { staticEntries, pools, dynamicRules, translations, stats }
  accessLists: {
    [1-99]:   [{ action, network, wildcard }]                                            // standard ACL
    [100-199]: [{ action, protocol, src, srcWildcard, dst, dstWildcard, port }]          // extended ACL
  }
  policies: [{ seq, action, src, srcWildcard, dst, dstWildcard, protocol, port }]  // firewall only
  vlans: { [id]: { name } }                         // switch only
  dhcp: {                                            // router (DHCP server)
    pools: { [name]: { network, mask, defaultRouter, dnsServer, lease, bindings } }
    excludedAddresses: [{ start, end }]
  }
  defaultGateway: string | null                      // PC/server only
  dhcpGateway: boolean | undefined                   // GW acquired via DHCP (PC only)
  arpTable: [{ ip, mac, iface }]                     // ARP cache for L3 devices
}
```

Additional interface fields:
```
interface {
  ...
  dhcpClient: boolean | undefined                    // Set by `ip address dhcp` (PC only)
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

Global Config  ──vlan <id>──>                       VLAN Config (switch only)
Global Config  ──router ospf <pid>──>               OSPF Router Config (R/FW)
Global Config  ──ip dhcp pool <name>──>             DHCP Pool Config (router)
Global Config  ──crypto isakmp policy <n>──>        ISAKMP Policy Config (R/FW)
Global Config  ──crypto map <name> <seq> ipsec-isakmp──>  Crypto Map Config (R/FW)

exit: return one level up / end: return to Privileged EXEC
```

Prompts per mode:
| Mode | Prompt |
|------|--------|
| User EXEC | `Hostname>` |
| Privileged EXEC | `Hostname#` |
| Global | `Hostname(config)#` |
| Interface | `Hostname(config-if)#` |
| VLAN | `Hostname(config-vlan)#` |
| OSPF Router | `Hostname(config-router)#` |
| DHCP Pool | `Hostname(dhcp-config)#` |
| ISAKMP | `Hostname(config-isakmp)#` |
| Crypto Map | `Hostname(config-crypto-map)#` |

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

##### Static Routing

| Command | Action | Applicable Devices |
|---------|--------|-------------------|
| `ip route <network> <mask> <next-hop>` | Add static route | R, FW, SV, L3SW |
| `no ip route <network> <mask> <next-hop>` | Delete static route | R, FW, SV, L3SW |
| `ip default-gateway <ip>` | Set default gateway | PC, SV |

##### OSPF (Dynamic Routing)

| Command | Mode change | Action | Devices |
|---------|------------|--------|---------|
| `router ospf <pid>` | config-router | Start an OSPF process (pid: 1-65535) | R, FW |
| `no router ospf <pid>` | - | Delete an OSPF process | R, FW |
| `network <ip> <wildcard> area <area-id>` | (in config-router) | Activate OSPF on matching interfaces | R, FW |
| `no network <ip> <wildcard> area <area-id>` | (in config-router) | Remove a network statement | R, FW |
| `router-id <ip>` | (in config-router) | Set explicit OSPF router-id (default: highest IF IP) | R, FW |
| `no router-id` | (in config-router) | Clear router-id | R, FW |

OSPF behavior:
- Adjacency forms between interfaces matching a `network` statement when subnets match **and** they are L2-reachable
- Routes propagate through the OSPF graph via BFS; next-hop resolves to the directly-connected neighbor IP
- AD = 110, cost is fixed at 1 (simplified)
- Static (AD 1) vs OSPF (AD 110) is decided by **longest prefix match first**, then AD as tiebreaker

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

#### 4.2.7a DHCP Commands

##### DHCP Server (Router)

| Command | Mode change | Action |
|---------|-----------|--------|
| `ip dhcp pool <name>` | dhcp-config | Create DHCP pool |
| `no ip dhcp pool <name>` | - | Delete DHCP pool |
| `ip dhcp excluded-address <start> [<end>]` | - | Reserve IPs to exclude from pool |
| `no ip dhcp excluded-address <start> [<end>]` | - | Remove exclusion |
| `network <network> <mask>` | (in dhcp-config) | Subnet to lease |
| `default-router <ip>` | (in dhcp-config) | Default gateway advertised to clients |
| `dns-server <ip>` | (in dhcp-config) | DNS server advertised to clients |
| `lease <days>` | (in dhcp-config) | Lease duration (display only; expiration not enforced) |

##### DHCP Client (PC)

| Command | Action |
|---------|--------|
| `ip address dhcp` | Start interface as DHCP client and lease from any L2-reachable router pool |
| `no ip address dhcp` | Stop client and release IP/GW |
| `renew dhcp` | (Privileged EXEC) Retry DHCP acquisition |

#### 4.2.8 SVI / L3 Switch Commands (Switch Only)

| Command | Action |
|---------|--------|
| `interface vlan <id>` | Create SVI (Switch Virtual Interface) and enter Interface Config |
| `ip address <ip> <mask>` | Set IP address on SVI |
| `no shutdown` | Enable SVI |
| `ip access-group <acl-num> in\|out` | Apply ACL to SVI |

- A switch with SVIs configured automatically operates as an L3 switch
- Inter-VLAN static routing is possible via SVIs
- Static routes can be added using the `ip route` command

#### 4.2.9 LACP / Bond Commands

| Command | Action | Applicable Devices |
|---------|--------|-------------------|
| `bond-group <name>` | Add interface to bond group (active-backup) | All |
| `show etherchannel summary` | Display bond group status summary | All |

- **Active-backup mode**: When the primary NIC goes down, the bond partner in the same group automatically takes over traffic
- Only one interface in a bond group actively forwards traffic at a time

#### 4.2.10 Show Commands

| Command | Description |
|---------|------------|
| `show ip interface brief` | Interface summary (IP, status) |
| `show running-config` | Full device configuration |
| `show interfaces` | Detailed interface information |
| `show ip route` | Routing table (C=connected, S=static, O=OSPF, *=default) |
| `show ip ospf` | OSPF process summary (ID, area count, IFs in process, network statements) |
| `show ip ospf neighbor` | OSPF neighbor list (Neighbor ID, State, Interface) |
| `show ip dhcp binding` | DHCP pool bindings (router) |
| `show ip dhcp pool` | DHCP pool state |
| `show crypto isakmp sa` | ISAKMP SA state |
| `show crypto ipsec sa` | IPsec SA state |
| `show ip nat translations` | NAT translation table |
| `show ip nat statistics` | NAT statistics |
| `show firewall policy` | Firewall policy list |
| `show access-lists` | ACL list (entries and applied interfaces) |
| `show arp` | ARP table |
| `show packet-flow <ip> [proto] [port]` | Detailed packet flow diagnostics (includes ACL/NAT/FW policy checks) |
| `show interfaces tunnel` | Tunnel interface details (VPN) |
| `show vlan brief` | VLAN summary (switch only) |
| `show interfaces trunk` | Trunk port information (switch only) |
| `show interfaces switchport` | Switchport configuration (switch only) |
| `show etherchannel summary` | Bond group status summary |

#### 4.2.11 Diagnostic Commands

| Command | Action |
|---------|--------|
| `ping <ip>` | Test connectivity to IP (with animation) |
| `traceroute <ip>` | Trace route hop-by-hop |
| `test access <ip> <proto> [port]` | Test firewall/ACL policy for specific protocol/port |
| `clear arp` | Clear ARP cache |

---

## 5. Simulation Engine Specifications

### 5.1 Routing Algorithm

1. **Directly connected networks**: Check if destination IP is on the same subnet as an interface
2. **Longest prefix match**: Static (`dv.routes`, AD 1) and OSPF (`dv.ospfRoutes`, AD 110) candidates are merged into a **single list**; the route with the longest CIDR wins
3. **AD tiebreaker**: Only when prefix lengths are equal, AD (lower wins) decides
4. **PC routing**: Check directly connected first, then use default gateway

The implementation lives in [`Routing.js`](../src/simulation/Routing.js): `lookupRoute` and the `pickBestRoute` helper. `describeRouteLookup` (used by `show packet-flow`) shares the same helper so the three-way consistency rule is preserved.

### 5.2 L2 Switching

- **VLAN-aware BFS (Breadth-First Search)**: Strict VLAN boundary isolation across the entire switch fabric
- **VLAN constraints**: Respects access port VLAN tags and trunk port allowed VLAN lists
- If VLANs don't match along the path, the destination is deemed unreachable
- **All BFS functions are VLAN-aware**: `isReachableViaSwitch`, `bfsSwitchPath`, `getL2BroadcastDomain`, and `canReachL2` all use a VLAN parameter
- **portCarriesVlan()**: Determines whether a switch port carries a given VLAN based on access/trunk mode
- **canReachL2()**: When reaching an L3 device through a switch, only checks the connected interface's IP (not all device interfaces)

### 5.2.1 L3 Switching (SVI)

- **SVI (Switch Virtual Interface)**: `interface vlan <id>` creates an L3 interface on a switch
- A switch with one or more SVIs automatically operates as an L3 switch with a routing table
- Inter-VLAN static routing is performed via SVIs
- ACLs can be applied to SVI interfaces
- L3 switches participate in routing engine path resolution like routers

### 5.2.2 LACP / Bond (active-backup)

- **Bond groups**: Multiple interfaces grouped as a single logical link
- **Active-backup mode**: When the active interface goes down, a partner interface in the same bond group automatically takes over traffic forwarding
- Bond-aware routing and packet forwarding (Routing.js, PingEngine.js)
- Bond group state is saved and restored in snapshots

### 5.2.3 OSPF Dynamic Routing

Implementation lives in [`OspfEngine.js`](../src/simulation/OspfEngine.js).

**Neighbor discovery (`buildNeighborGraph`)**:
1. Collect routers/firewalls with OSPF enabled (`router ospf <pid>` plus at least one `network` statement)
2. For every pair, find interfaces matching their respective `network` statements that share the same subnet and mask
3. **L2 reachability check**: Adjacency forms only when interfaces are directly cabled OR reachable through a switch fabric via VLAN-aware BFS
4. Same-subnet but no cable / VLAN-isolated pairs do **not** form adjacency (since v1.5.1)

**Route computation (`recomputeAllOspf`)**:
1. Clear `ospfRoutes = []` on every device
2. From each OSPF router, BFS through the neighbor graph
3. For each visited node, register the subnets covered by its `network` statements as learned routes
4. Next-hop resolves to the directly-connected neighbor IP (preserved during BFS recursion)

**Auto-recompute triggers**:
- `Store.setTopology` (Open in Simulator / snapshot restore / challenge load / template load)
- `router ospf` / `network` / `router-id` / `no router ospf` family commands
- Interface `shutdown` / `no shutdown` / `ip address` changes
- All of the above call `recomputeAllOspf(devices)`.

**Integration with route selection**: OSPF-learned routes live in `dv.ospfRoutes` and feed into the candidate list used by `lookupRoute` (see 5.1).

**Show output**:
- `show ip route` lists OSPF entries as `O <network>/<cidr> [110/1] via <next-hop>`
- `show ip ospf neighbor` shows Neighbor ID / State (FULL fixed) / Interface
- `show ip ospf` reports the process ID, router ID, area count, interfaces in the process, and the network statement list

### 5.2.4 VPN Tunnel (IPsec)

- **Tunnel interfaces**: `interface tunnel <id>` creates a tunnel IF on a router
- **tunnel source/destination/mode**: Configure the physical source IF, peer IP, and encapsulation mode
- **IPsec crypto configuration**: Define crypto parameters with `crypto isakmp policy`, `crypto ipsec transform-set`, and `crypto map`
- **Routing**: Site-to-site communication is achieved via static routes using the tunnel subnet as the next-hop
- **Packet forwarding**: When `forwardPacket` detects a tunnel match, the packet is forwarded directly to the peer device (logical path)
- **Ping animation**: `buildPingPath` recursively builds the underlay (physical) path, animating through intermediate devices such as ISP routers
- **ACL bypass**: Packets after tunnel decapsulation bypass ACLs on the physical WAN interface (same behavior as real equipment)

### 5.2.5 DHCP

**Server (router)**:
- `ip dhcp pool <name>` defines a pool (network/mask/default-router/dns/lease)
- `ip dhcp excluded-address` reserves IPs that must not be leased
- `dv.dhcp.pools[name].bindings` records the client-id-to-IP mapping

**Client (PC)**:
- `ip address dhcp` activates the client interface
- `tryDhcpAssign(devices, pcDevId, pcIfName)` walks the L2 broadcast domain via VLAN-aware BFS to locate routers
- Tries every pool on each reachable router and picks the lowest available IP within the pool range
- Skips IPs already in use by other devices or covered by exclusion ranges
- On success, sets the PC's `iface.ip / iface.mask / dev.defaultGateway` (and flags `dhcpGateway: true`)
- `no ip address dhcp` releases the binding; `renew dhcp` retries acquisition

**Constraints**:
- Lease expiry is not enforced (no lease timer)
- DHCP relay (`ip helper-address`) is not supported — clients can only lease from a router on the same L2 segment

### 5.3 NAT Processing

#### 5.3.1 NAT Direction and Functions

| Direction | Function | Processing |
|-----------|----------|-----------|
| **DNAT (Outside → Inside)** | `applyDNAT` | Translate destination global IP to local IP via static NAT table |
| **SNAT (Inside → Outside)** | `applySNAT` | (1) Static NAT source translation → (2) Dynamic NAT (ACL + pool allocation) |
| **Combined (for routers)** | `applyNAT` | Execute DNAT → SNAT in one pass |

- **Pool allocation**: Round-robin from available IPs
- **Statistics**: Tracks hit/miss counts

#### 5.3.2 Firewall NAT/Policy Processing Order

Similar to real-world firewalls (CheckPoint/UTX200), the firewall applies DNAT and SNAT at different stages:

```
Packet arrives
    ↓
① DNAT (Destination NAT)       ← before policy evaluation
    ↓
② Firewall Policy evaluation   ← translated destination + original source
    ↓
③ SNAT (Source NAT / Hide NAT) ← after policy evaluation
    ↓
Packet forwarded
```

Routers (Cisco IOS style) continue to use the traditional `NAT (combined) → ACL` order.

### 5.4 ACL Filtering

ACLs are applied per-interface in the `in` (inbound) or `out` (outbound) direction.

**Evaluation order:**
1. Entries are evaluated top-to-bottom in definition order
2. The first matching entry's `permit`/`deny` action is applied
3. If no entry matches, implicit **deny all**

**Matching logic:**
- **Standard ACL**: Compares source IP only using wildcard mask
- **Extended ACL**: Compares source IP, destination IP, and protocol (ip/tcp/udp/icmp). Port matching applies only when `eq` is specified

**Router packet processing order:**
1. Packet arrives at interface → NAT translation (DNAT + SNAT combined)
2. **Inbound ACL** check
3. Routing lookup
4. Egress interface determined → **outbound ACL** check
5. Packet forwarded

**Firewall packet processing order:**
1. Packet arrives at interface → **DNAT** (Destination NAT)
2. **Firewall policy** check
3. **Inbound ACL** check
4. **SNAT** (Source NAT / Hide NAT)
5. Routing lookup
6. Egress interface determined → **outbound ACL** check
7. Packet forwarded

### 5.5 Firewall Filtering

1. Policies evaluated in ascending sequence number order
2. Wildcard mask IP matching: `(IP & ~wildcard) === (network & ~wildcard)`
3. First matching rule's `permit`/`deny` action is applied
4. If no rule matches, implicit **deny all**

### 5.6 ARP Resolution

#### 5.6.1 ARP Table

Each L3 device (router, firewall, server, PC) maintains an ARP table.

```
arpTable: [{ ip: string, mac: string, iface: string }]
```

- **MAC address generation**: Deterministic generation from device ID and interface name via `generateMAC(deviceId, ifName)`
- **Learning timing**: Learned between adjacent L3 devices along the path during ping/traceroute execution
- **Subnet determination**: Uses the sender's subnet mask to determine if a peer IP is in the same subnet (supports /16 masks)
- **VLAN-aware**: Only interfaces reachable within the same VLAN are ARP learning targets

#### 5.6.2 ARP Resolution Visualization

When executing ping, if the ARP table lacks an entry for an L3 hop, an ARP resolution animation is displayed **before** the ICMP animation.

| Phase | Description | Visual |
|-------|-------------|--------|
| **ARP Request** | Source → switch → flood to entire L2 broadcast domain | Gold diamond-shaped particle with `ARP: Who has X.X.X.X?` label |
| **Broadcast result** | Hit indicator on target device, miss on non-targets | Green checkmark / red X mark |
| **ARP Reply** | Target → switch → unicast response to source | Orange diamond-shaped particle with `ARP Reply: X.X.X.X is at MAC` label |

- **Skipped on subsequent pings**: If the ARP table already has a cached entry, ARP resolution is omitted
- **Terminal output**: ARP Request/Reply messages displayed in gold color
- **VLAN isolation**: Broadcasts flood only to devices within the same VLAN

### 5.7 Packet Path Construction

1. Resolve routing hop-by-hop from source to destination
2. Check inbound ACL on each router/firewall ingress interface
3. Apply NAT translation at each router/firewall
4. Perform firewall policy checks at each firewall device
5. Check outbound ACL on egress interface
6. Use VLAN-aware BFS for switch fabric traversal
7. Loop detection (visited set) prevents infinite loops
8. **linkHints array**: Records the interface pair (fromIf, toIf) used for each segment, enabling accurate link identification in animations and ARP resolution

### 5.8 Packet Flow Diagnostics

The `show packet-flow <ip> [proto] [port]` command displays detailed decisions at each hop:

- Ingress interface
- Local check (is destination on this device?)
- **DNAT translation** (firewall: destination NAT before policy evaluation)
- **Firewall policy check** (evaluated with translated destination + original source)
- **SNAT translation** (firewall: source NAT after policy evaluation)
- **ACL check (inbound/outbound)**
- Routing lookup (selected route and next-hop)
- **VPN tunnel encapsulation** (when tunnel match is detected)
- Egress interface
- L2 switching (VLAN-aware forwarding)
- **L3 switch inter-VLAN routing** (forwarding between VLANs via SVI)

The `test access <ip> <proto> [port]` command performs the same diagnostics as `show packet-flow` for a specific protocol/port. It is ideal for unit-testing individual firewall policy rules.

---

## 6. UI Specifications

### 6.1 Screen Layout

```
┌─── Header ──────────────────────────────────────────────────────────────┐
│ Title | [File ▾] [Templates] [Learn] [Challenge]    ...    [JA/EN]      │
├─────────────────────────────────────────────────────────────────────────┤
│  Terminal Panel                       │ ▌ │  Canvas Panel               │
│  ┌──────────────────────────────┐    │   │  ┌── Device Tabs (right) ──┐ │
│  │ Terminal Header              │    │ S │  │ R1 │ SW1 │ PC1 │ ...    │ │
│  │ Output Area                  │    │ P │  ├──────────────────────────┤ │
│  │ Hints Panel                  │    │ L │  │   Topology Canvas        │ │
│  │ Input Prompt                 │    │ I │  │   [Design Mode]          │ │
│  └──────────────────────────────┘    │ T │  │   Legend / ? Help        │ │
│                                       │   │  └──────────────────────────┘ │
└───────────────────────────────────────┴───┴──────────────────────────────┘
```

- **Header toolbar**:
  - **File dropdown**: Save / Load / Export JSON / Import JSON / Export Script (Cisco) / Export Script (YAMAHA) / Export Image / **Load Script** / Reset Topology
  - **Templates**: Open the template selector modal
  - **Learn**: Open the Learn Mode (tutorial) lesson selector
  - **Challenge**: Open the Challenge Mode (exercise) scenario selector
  - **JA/EN toggle**: Top-right language switch (click to toggle JA ⇔ EN)
- **Device tabs**: Top-right of the canvas panel — click to switch the active device
- **Splitter**: Draggable boundary between canvas and terminal (position saved in localStorage)
- **Design Palette**: Shown when Design Mode is active
- **Test Mode button**: Visible only on the `feature/test-mode` branch — opens the automated test screen (not shipped in releases)

### 6.2 Canvas Display

- **Device icons**: Unique shapes and type-specific colors per device type
- **Device type colors**: Router = green, Switch = orange, Firewall = red, Server = purple, PC = blue
- **Status brightness**: Bright = all interfaces UP, dim = partial UP, dark = all DOWN
- **Links**: Lines connecting devices, color-coded by VLAN
- **Edge-based link rendering**: Links originate from device edges (not centers), with each interface having a distinct attachment point
- **Parallel links**: Multiple links between the same device pair are offset using a consistent perpendicular normal based on sorted device IDs, with labels spread along link direction
- **Legend (2 rows)**: Row 1 = device type colors, Row 2 = link status / trunk / VLAN info
- **Packet animation**: Visual packet movement along link lines during ping/traceroute (linkHints ensure correct link tracking)
- **ARP resolution animation**: Visualizes ARP Request broadcasts (gold diamond) and ARP Reply unicasts (orange) before ICMP ping

### 6.2.1 Canvas Zoom / Pan

- **Mouse wheel zoom**: Cursor-centered zoom in/out (20%–400%)
- **Pan drag**: Drag empty canvas area to pan the viewport (works in both design and normal modes)
- **Middle mouse button pan**: Pan by dragging with the middle mouse button
- **Double-click fit**: Double-click empty canvas area to fit all devices in view
- **Zoom indicator**: Displays current zoom level at bottom-left corner

### 6.3 Terminal

- **Color output**: Commands (cyan), success (green), errors (red), ARP info (gold)
- **Tab completion**: Auto-complete commands with Tab key
- **Command history**: Navigate history with up/down arrow keys
- **Command hints**: Real-time suggestions based on current input

### 6.4 Template Selector

Open via Templates button to choose from pre-configured network templates for instant loading.

| Template | Topology | Learning Focus |
|----------|----------|---------------|
| Simple LAN | R1 + SW1 + PC x3 | Basic IP config, ping |
| Multi-Subnet Routing | R x2 + SW x2 + PC x4 | Inter-subnet routing |
| DMZ with Firewall | FW + R + SW x2 + SV x2 + PC x2 | Firewall policies, DMZ |
| VLAN with Inter-VLAN Routing | R1 + SW1(VLAN10/20) + PC x4 | VLAN segregation, inter-VLAN routing |
| NAT to Internet | R x2 + SW + SV + PC x2 | Dynamic NAT, ACLs |
| Site-to-Site VPN | R x3 + SW x2 + PC x4 | IPsec tunnels, VPN routing |
| Empty Canvas | None | Build from scratch |

### 6.5 Learn Mode (Tutorials)

Interactive tutorials launched from the Learn button. Each lesson is split into steps; the canvas renders illustrative animations while the side panel narrates the concept.

| Lesson ID | Title | Category |
|-----------|-------|----------|
| `lesson-ip-address` | IP Address Basics | Layer 3 |
| `lesson-subnet-mask` | Subnet Masks and CIDR | Layer 3 |
| `lesson-network-broadcast` | Network Address & Broadcast | Layer 3 |
| `lesson-ethernet-switch` | Ethernet and Switching | Layer 2 |
| `lesson-packet-structure` | Packet & Frame Structure | Fundamentals |
| `lesson-routing` | Routing Fundamentals | Layer 3 |
| `lesson-ospf` | OSPF: Dynamic Routing | L3 Routing |

Implementation lives under [`src/learn/`](../src/learn/). Lessons are objects with `id`, `title`, `description`, `category`, and `steps[]`. `LearnEngine` drives step progression; `LearnUI` renders the side panel.

### 6.6 Challenge Mode (Exercises)

Hands-on scenarios launched from the Challenge button. Objectives turn green when their goal (connectivity, specific route configuration, ACL applied, etc.) is met.

| Scenario ID | Level | Theme |
|-------------|-------|-------|
| `beginner-first-ping` | Beginner | First successful ping |
| `beginner-dhcp` | Beginner | DHCP lease |
| `beginner-default-gw` | Beginner | Default gateway |
| `beginner-static-route` | Beginner | Static route |
| `inter-vlan-isolation` | Intermediate | VLAN isolation |
| `inter-vlan-routing` | Intermediate | Inter-VLAN routing |
| `inter-nat` | Intermediate | NAT |
| `inter-acl` | Intermediate | ACL filtering |
| `adv-ospf` | Advanced | OSPF multi-router |
| `adv-firewall` | Advanced | Firewall DMZ |
| `adv-vpn` | Advanced | Site-to-site IPsec VPN |
| `adv-troubleshoot` | Advanced | Troubleshooting |
| `adv-comprehensive` | Advanced | Comprehensive exercise |

Implementation in [`src/challenge/`](../src/challenge/). `ChallengeEngine` periodically evaluates each `obj.check(devices)` and reflects status back to the UI. The challenge panel is a draggable floating window.

### 6.7 Internationalization (i18n)

Two languages: JA / EN. The top-right toggle switches the active locale; the choice is persisted to localStorage.

- Strings are expanded via the `data-i18n="key"` attribute or the `t('key')` API
- Locale files in [`src/i18n/locales/`](../src/i18n/):
  - `ja.js` / `en.js` — common UI
  - `ja_help.js` / `en_help.js` — Help overlay
  - `ja_learn.js` / `en_learn.js` — Learn Mode
  - `ja_challenge.js` / `en_challenge.js` — Challenge Mode
- On switch, `onLocaleChanged` triggers a full UI re-render

---

## 7. Data Persistence Specifications

### 7.1 Storage Methods

| Method | Description |
|--------|-------------|
| **Auto-save** | Automatically saves to browser localStorage on configuration changes |
| **Manual save** | Saves to localStorage with timestamp (File > Save) |
| **JSON Export** | Downloads configuration as JSON file (File > Export JSON) |
| **JSON Import** | Loads configuration from JSON file (File > Import JSON) |
| **Cisco Script Export** | Exports all device configs as Cisco IOS-style CLI text (File > Export Script (Cisco)) |
| **YAMAHA Script Export** | Exports configs in YAMAHA RTX/SWX/UTX command format (File > Export Script (YAMAHA)) |
| **Image Export** | Exports the canvas as a transparent PNG (File > Export Image) |
| **Load Script** | Paste a Cisco-style CLI script into a modal and run line-by-line (File > Load Script) |
| **Templates** | Load from pre-configured network templates (Templates) |
| **Reset** | Restores to initial state with confirmation dialog (File > Reset Topology) |

### 7.2 Data Format

**JSON format** containing:
- All device configurations (IP addresses, routing, NAT, ACLs, VLANs, firewall policies, etc.)
- All link connection information
- Device canvas positions

### 7.3 Script Export Format

#### Cisco IOS format

Text file (`.txt`) with executable CLI commands for all devices in proper order:
- Each device: `enable` → `configure terminal` → configurations → `end`
- ACLs/NAT pools defined before interfaces (to satisfy reference order)
- Includes VLANs, firewall policies, static routes, **OSPF (router ospf / network / router-id)**, default gateway, **DHCP pools**, and **IPsec crypto configuration**
- Because the data model stores router-id at the device level, it is emitted only under the first OSPF process to avoid duplication

#### YAMAHA format

Maps the configuration onto YAMAHA-specific commands:
- Routers: targets RTX1220 (`ip route`, `nat descriptor`, `ip filter`, IPsec)
- Switches: targets SWX2310 (VLAN configuration)
- Firewalls: targets UTX200 (filter rules)

### 7.4 Load Script feature

`File > Load Script` opens a modal where you can paste a Cisco IOS-style CLI script and execute it.

- Lines are executed top-to-bottom; comment lines (starting with `!`) are skipped
- Each command's output is mirrored to the terminal
- Commands without an explicit device target apply to the currently selected device — switch device tabs first if needed

### 7.5 Splitter Position

Canvas/terminal boundary position saved in localStorage and restored on reload.

---

## 8. Limitations and Differences from Real Equipment

| Feature | This Simulator | Real Cisco IOS |
|---------|---------------|----------------|
| IP Version | IPv4 only | IPv4/IPv6 |
| Routing Protocols | Static + **OSPF (simplified)** | Full OSPF, BGP, EIGRP, IS-IS, etc. |
| OSPF coverage | Neighbor discovery / route propagation / AD = 110 / fixed cost = 1. **Areas ignored (single-area equivalent)**, no ABR/ASBR/Type-5 LSAs, no Hello/Dead timers | Full specification |
| OSPF device support | router / firewall (L3 switch SVI not supported) | All L3 devices |
| Firewall | Stateless, DNAT→Policy→SNAT order | Stateful |
| VPN | IPsec tunnels (static IKE/SA definitions) | IKE negotiation, dynamic SA |
| L2 Protocols | VLANs, basic switching, LACP/Bond (active-backup) | STP, LACP, LLDP, etc. |
| L3 Switch | SVI (Light L3), inter-VLAN static routing | Full L3 switching, dynamic routing |
| NAT | Static, dynamic (basic) | PAT, NAT-T, advanced features |
| ACLs | Standard ACLs (1-99), Extended ACLs (100-199) | Standard/extended/named ACLs |
| DHCP | Pool-based leasing, no expiry enforcement, no relay | Full specification |
| QoS | None | Various QoS features |
| Spanning Tree | None (no loop prevention) | STP/RSTP/MSTP |
