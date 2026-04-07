# Network Simulator Operation Manual

**Version:** 1.3
**Last Updated:** 2026-04-06

---

## 1. Introduction

This manual covers how to launch the network simulator and provides step-by-step instructions for all features.

---

## 2. Getting Started

1. Open `index.html` in a web browser
2. The simulator launches with a default network topology
3. If a previous configuration exists in localStorage, it is automatically restored

---

## 3. Understanding the Screen

### 3.1 Layout Overview

| Area | Description |
|------|-------------|
| **Header** | Application title, device tabs, toolbar buttons |
| **Terminal (left)** | CLI command input and output |
| **Canvas (right)** | Network topology visualization with devices and links |

### 3.2 Device Tabs

Device tabs appear in the header. Click a tab to switch to that device's CLI.

### 3.3 Device Type Colors

Each device type has a unique color. Status is indicated by brightness.

| Device | Color |
|--------|-------|
| Router | Green |
| Switch | Orange |
| Firewall | Red |
| Server | Purple |
| PC | Blue |

| Brightness | Meaning |
|------------|---------|
| Bright | All interfaces UP |
| Dim | Some UP |
| Dark | All DOWN |

### 3.4 Toolbar

| Button | Function |
|--------|----------|
| **File ▾** | Dropdown menu (Save/Load/Export JSON/Import JSON/Export Script) |
| **Templates** | Open template selection screen |
| **Design Mode** | Toggle design mode |
| **Reset** | Reset to initial state |
| **? Help** | Show command reference (bottom-left of canvas) |

### 3.5 Splitter

Drag the boundary between canvas and terminal to adjust panel widths. Position is saved in the browser and restored on reload.

---

## 4. Design Mode (Topology Editing)

### 4.1 Entering Design Mode

Click the "Design Mode" button in the toolbar. A device palette appears on the left side of the screen.

### 4.2 Adding Devices

1. Drag a device (Router, Switch, Firewall, Server, PC) from the palette
2. Drop it anywhere on the canvas
3. A name is automatically assigned (R1, SW1, FW1, SV1, PC1, etc.)

### 4.3 Moving Devices

While in design mode, drag devices on the canvas to reposition them.

### 4.4 Creating Links

1. Select the "Link" tool from the device palette
2. Click the source device
3. Click the destination device
4. An interface selection dialog appears — select interfaces for both ends
5. Click "Connect" to create the link

### 4.5 Context Menus

- **Right-click on a device**: Delete, rename, etc.
- **Right-click on a link**: Delete the link

### 4.6 Exiting Design Mode

Click the "Design Mode" button again to return to normal mode.

---

## 5. CLI Basics

### 5.1 Entering Commands

Type commands at the prompt at the bottom of the terminal and press Enter to execute.

### 5.2 Tab Completion

Type part of a command and press Tab to auto-complete.

**Examples:**
```
Router> en[Tab]  →  Router> enable
Router# conf[Tab]  →  Router# configure terminal
```

### 5.3 Command Abbreviations

Commands can be abbreviated as long as they are unambiguous, just like real Cisco IOS.

**Examples:**
```
conf t     → configure terminal
int gi0/0  → interface GigabitEthernet0/0
sh ip int br → show ip interface brief
```

### 5.4 Command History

- **Up arrow**: Show previous command
- **Down arrow**: Show next command

### 5.5 Command Hints

As you type, context-sensitive command suggestions appear in real-time below the terminal.

### 5.6 Switching Devices

Click device tabs in the header to switch between device CLIs.

---

## 6. Basic Configuration Tutorial

### 6.1 Configuring a Router IP Address

```
Router> enable
Router# configure terminal
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip address 192.168.1.1 255.255.255.0
Router(config-if)# no shutdown
Router(config-if)# end
```

### 6.2 Configuring a PC IP Address and Default Gateway

```
PC> enable
PC# configure terminal
PC(config)# interface FastEthernet0
PC(config-if)# ip address 192.168.1.10 255.255.255.0
PC(config-if)# no shutdown
PC(config-if)# exit
PC(config)# ip default-gateway 192.168.1.1
PC(config)# end
```

### 6.3 Adding a Static Route

Static routes can be configured on Router, Firewall, Server, and L3 Switch devices.

```
Router# configure terminal
Router(config)# ip route 10.0.0.0 255.255.255.0 192.168.1.2
Router(config)# end
```

### 6.4 Testing Connectivity

```
PC# ping 192.168.1.1
```

On success, a packet animation appears on the canvas and results are displayed in the terminal.

### 6.5 Configuring a Server

Unlike PCs, servers support multiple interfaces and static routes.

```
Server> enable
Server# configure terminal
Server(config)# interface Ethernet0
Server(config-if)# ip address 192.168.1.100 255.255.255.0
Server(config-if)# no shutdown
Server(config-if)# exit
Server(config)# interface Ethernet1
Server(config-if)# ip address 10.0.0.100 255.255.255.0
Server(config-if)# no shutdown
Server(config-if)# exit
Server(config)# ip default-gateway 192.168.1.1
Server(config)# ip route 172.16.0.0 255.255.0.0 10.0.0.1
Server(config)# end
```

### 6.6 Tracing a Route

```
PC# traceroute 10.0.0.1
```

Hop-by-hop information is displayed in the terminal.

---

## 7. VLAN Configuration Guide

### 7.1 Creating VLANs

```
Switch> enable
Switch# configure terminal
Switch(config)# vlan 10
Switch(config-vlan)# name Sales
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name Engineering
Switch(config-vlan)# end
```

### 7.2 Configuring Access Ports

```
Switch(config)# interface FastEthernet0/1
Switch(config-if)# switchport mode access
Switch(config-if)# switchport access vlan 10
Switch(config-if)# no shutdown
```

### 7.3 Configuring Trunk Ports

```
Switch(config)# interface FastEthernet0/24
Switch(config-if)# switchport mode trunk
Switch(config-if)# switchport trunk allowed vlan 10,20
Switch(config-if)# no shutdown
```

### 7.4 Verifying VLAN Configuration

```
Switch# show vlan brief
Switch# show interfaces trunk
Switch# show interfaces switchport
```

---

## 8. NAT Configuration Guide

### 8.1 Static NAT

To translate internal IP `192.168.1.10` to external IP `203.0.113.10` (1:1 mapping):

```
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip nat inside
Router(config-if)# exit
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip nat outside
Router(config-if)# exit
Router(config)# ip nat inside source static 192.168.1.10 203.0.113.10
```

### 8.2 Dynamic NAT

Define the internal network with an ACL and dynamically assign IPs from a NAT pool:

```
Router(config)# access-list 1 permit 192.168.1.0 0.0.0.255
Router(config)# ip nat pool MYPOOL 203.0.113.1 203.0.113.10 netmask 255.255.255.0
Router(config)# ip nat inside source list 1 pool MYPOOL
```

### 8.3 Verifying NAT Status

```
Router# show ip nat translations
Router# show ip nat statistics
```

---

## 9. Firewall Configuration Guide

### 9.1 Adding Policies

Allow ICMP from internal network `192.168.1.0/24` to any destination:

```
FW(config)# firewall policy 10 permit 192.168.1.0 0.0.0.255 any any icmp
```

Allow TCP port 80 between specific hosts:

```
FW(config)# firewall policy 20 permit 192.168.1.10 0.0.0.0 10.0.0.1 0.0.0.0 tcp 80
```

Explicitly deny all traffic (normally implicit):

```
FW(config)# firewall policy 999 deny any any any any ip
```

### 9.2 Viewing and Deleting Policies

```
FW# show firewall policy

FW(config)# no firewall policy 20        # Delete specific policy
FW(config)# no firewall policy all       # Delete all policies
```

### 9.3 NAT/Policy Processing Order

On firewalls, the order of NAT and policy application is important:

```
① DNAT (Destination NAT)  → ② Policy evaluation → ③ SNAT (Source NAT)
```

- **Destination NAT (DNAT)** is applied **before** policy evaluation
- Policies are evaluated with the **post-DNAT destination IP** and **pre-SNAT source IP**
- **Source NAT (SNAT / Hide NAT)** is applied **after** policy evaluation

Example: External access to a web server
```
External PC (10.0.0.10) → FW WAN IP (10.1.2.11:443)
  ① DNAT: dst 10.1.2.11 → 192.168.1.10
  ② Policy: permit any -> 192.168.1.10 tcp/443 → PERMIT
  ③ SNAT: none
  → Reaches 192.168.1.10 (WebSV)
```

### 9.4 Important Notes

- Policies are evaluated in ascending sequence number order
- The first matching rule is applied
- If no rule matches, an implicit **deny all** applies
- The firewall is stateless (return traffic must also be explicitly permitted)
- Use the `test access` command to verify policy decisions for specific protocols/ports

---

## 10. ACL (Access Control List) Configuration Guide

### 10.1 Creating Standard ACLs

Standard ACLs (numbers 1–99) filter by source IP address:

```
Router(config)# access-list 10 permit 192.168.1.0 0.0.0.255
Router(config)# access-list 10 deny 10.0.0.0 0.0.0.255
```

### 10.2 Creating Extended ACLs

Extended ACLs (numbers 100–199) filter by source/destination IP, protocol, and port:

**Example 1: Allow HTTP between specific networks**
```
Router(config)# access-list 100 permit tcp 192.168.1.0 0.0.0.255 10.0.0.0 0.0.0.255 eq 80
```

**Example 2: Deny ICMP from a specific host**
```
Router(config)# access-list 100 deny icmp host 192.168.1.100 any
```

**Example 3: Allow all remaining traffic**
```
Router(config)# access-list 100 permit ip any any
```

#### Keywords

| Keyword | Meaning | Example |
|---------|---------|---------|
| `any` | All IP addresses | `access-list 100 permit ip any any` |
| `host <ip>` | Single host (wildcard 0.0.0.0) | `access-list 100 deny icmp host 10.0.0.1 any` |
| `eq <port>` | Specify TCP/UDP port number | `... tcp ... eq 443` |

### 10.3 Applying ACLs to Interfaces

After defining an ACL, you must apply it to an interface for filtering to take effect. ACLs can be applied on Router, Firewall, and L3 Switch (SVI) interfaces.

```
Router(config)# interface GigabitEthernet0/0
Router(config-if)# ip access-group 100 in       # Apply to incoming packets
Router(config-if)# exit
Router(config)# interface GigabitEthernet0/1
Router(config-if)# ip access-group 100 out      # Apply to outgoing packets
```

### 10.4 Verifying ACLs

```
Router# show access-lists                       # ACL list and applied interfaces
Router# show running-config                     # Full config including ip access-group
```

### 10.5 Deleting ACLs

```
Router(config)# no access-list 100              # Delete entire ACL
```

Or remove only the interface binding:

```
Router(config-if)# no ip access-group 100 in    # Remove inbound ACL
```

### 10.6 Important Notes

- ACL entries are evaluated top-to-bottom in definition order
- The first matching entry determines the action (subsequent entries are not checked)
- **Implicit deny all**: Packets not matching any entry are dropped
- An ACL has no effect until applied to an interface with `ip access-group`
- ACLs are supported on Router, Firewall, and L3 Switch (SVI interfaces)
- Standard ACLs can also be used for NAT condition matching (`ip nat inside source list`)

---

## 11. Packet Flow Diagnostics

### 11.1 The show packet-flow Command

Displays detailed decision-making at each hop as a packet travels to its destination. When protocol and port are omitted, the packet is evaluated as ICMP.

```
Router# show packet-flow 10.0.0.1
Router# show packet-flow 192.168.1.11 tcp 443
```

### 11.2 The test access Command

Performs the same diagnostics as `show packet-flow` for a specific protocol/port. Ideal for unit-testing firewall policies and ACL rules.

```
PC# test access 192.168.1.11 tcp 443
PC# test access 10.161.32.122 tcp 80
PC# test access 192.168.1.11 icmp
```

### 11.3 Reading the Output

```
Packet flow: PC1 (192.168.1.10) -> 192.168.1.11 (TCP/443)

[Hop 1] PC1 (Pc)
├ Destination 192.168.1.11 is not on this device
├ Using default gateway 192.168.1.1
└ Exit Ethernet0 -> next hop 192.168.1.1

[Hop 2] UTX200 (Firewall) via Gi0/1
├ Received on GigabitEthernet0/1 (192.168.0.2)
├ NAT outside->inside: dst 10.1.2.11 -> 192.168.1.11
├ Policy seq 10: permit any -> 192.168.1.11 tcp eq 443 -> PERMIT
├ Destination 192.168.1.11 is not on this device
├ Directly connected on GigabitEthernet0/2 (192.168.1.0/24)
└ Exit GigabitEthernet0/2 -> L2 delivery to 192.168.1.11

Result: ACCESS PERMITTED (TCP/443) - 5 hops
```

| Symbol | Meaning |
|--------|---------|
| `├` | Intermediate check |
| `└` | Forwarding decision |
| `✗` | Error (unreachable, etc.) |
| `~` | L2 switching |

### 11.4 Firewall NAT/Policy Display Order

At firewall hops, the output follows the same processing order as real equipment:

1. **DNAT (Destination NAT)** -- translate destination IP from external to internal
2. **Policy evaluation** -- evaluated with translated destination + original source
3. **SNAT (Source NAT / Hide NAT)** -- translate source IP from internal to external

---

## 12. ARP Resolution Visualization

### 12.1 Overview

When executing a ping command, if the destination device's MAC address is not in the ARP table, the ARP resolution process is visually displayed before the ICMP packet animation.

### 12.2 ARP Resolution Flow

1. **ARP Request (Broadcast)**: A gold diamond-shaped particle travels from the source to the switch, then floods simultaneously to all devices in the L2 broadcast domain
2. **Hit/Miss Indicators**: A green checkmark appears on the target device; red X marks appear on non-target devices
3. **ARP Reply (Unicast)**: An orange diamond-shaped particle returns from the target to the source, displaying the resolved MAC address
4. **ICMP Begins**: After ARP resolution completes, the normal ping animation (green/blue particles) starts

### 12.3 Viewing the ARP Table

```
Router# show arp
Protocol  Address      Age (min)  Hardware Addr   Type  Interface
Internet  10.0.1.1     -          00:50:56:36:d7:dd  ARPA  Gi0/0
Internet  172.16.0.11  0          00:50:56:b3:00:72  ARPA  Gi0/1
```

### 12.4 Clearing ARP Cache

```
Router# clear arp
```

Clearing the ARP cache causes the next ping to display the ARP resolution animation again, allowing you to repeatedly observe broadcast behavior.

### 12.5 VLAN Isolation and ARP

ARP broadcasts only reach devices within the **same VLAN**. Devices on different VLANs cannot receive ARP requests, so even devices on the same IP subnet will fail to communicate if they are on different VLANs.

```
Example: Firewall Gi0/1 (VLAN 1) → DBServer Eth1 (VLAN 20)
         → Communication fails even if IP subnet matches, because VLANs differ
```

### 12.6 Terminal Output

During ARP resolution, gold-colored messages appear in the terminal:

```
ARP: Firewall1 — Who has 172.16.0.11? Tell 172.16.0.1
ARP: 172.16.0.11 is at 00:50:56:b3:00:72
```

---

## 13. L3 Switch (SVI / Inter-VLAN Routing) Configuration Guide

A standard Switch becomes L3-capable when SVI (Switch Virtual Interface) is configured. There is no separate "L3 Switch" device type — any switch with SVIs can perform inter-VLAN routing.

### 13.1 Creating VLANs and Assigning SVIs

```
Switch> enable
Switch# configure terminal
Switch(config)# vlan 10
Switch(config-vlan)# name Sales
Switch(config-vlan)# exit
Switch(config)# vlan 20
Switch(config-vlan)# name Engineering
Switch(config-vlan)# exit
Switch(config)# interface vlan 10
Switch(config-if)# ip address 192.168.10.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# exit
Switch(config)# interface vlan 20
Switch(config-if)# ip address 192.168.20.1 255.255.255.0
Switch(config-if)# no shutdown
Switch(config-if)# end
```

### 13.2 Adding a Default Route on L3 Switch

```
Switch(config)# ip route 0.0.0.0 0.0.0.0 10.0.0.1
```

### 13.3 Applying ACLs on SVI Interfaces

ACLs can be applied to SVI interfaces just like physical interfaces:

```
Switch(config)# access-list 100 deny icmp 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255
Switch(config)# access-list 100 permit ip any any
Switch(config)# interface vlan 10
Switch(config-if)# ip access-group 100 in
```

### 13.4 Verification Commands

```
Switch# show ip route                  # View the L3 routing table
Switch# show access-lists              # View ACLs and hit counts
Switch# show ip interface brief        # View SVI interface status
Switch# show vlan brief                # Confirm VLAN-to-SVI mapping
```

### 13.5 Important Notes

- A switch with at least one SVI is treated as an L3 switch and participates in IP routing
- SVIs act as the default gateway for hosts in each VLAN
- Static routes and ACLs work the same way as on routers
- Inter-VLAN traffic is routed through the switch without needing an external router

---

## 14. LACP / Bonding Configuration Guide

Servers and PCs support active-backup bonding for redundant NIC connections. When the primary NIC goes down, traffic automatically fails over to the partner NIC.

### 14.1 Creating a Bond Group

```
Server> enable
Server# configure terminal
Server(config)# interface Ethernet0
Server(config-if)# bond-group BOND1
Server(config-if)# exit
Server(config)# interface Ethernet1
Server(config-if)# bond-group BOND1
Server(config-if)# end
```

The first interface added becomes the **primary** (active) NIC. The second becomes the **backup** (standby) NIC.

### 14.2 Removing a Bond Group

```
Server(config)# interface Ethernet0
Server(config-if)# no bond-group
Server(config-if)# exit
Server(config)# interface Ethernet1
Server(config-if)# no bond-group
```

### 14.3 Verifying Bond Status

```
Server# show etherchannel summary
```

This displays the bond group name, member interfaces, and which NIC is currently active.

### 14.4 Failover Behavior

1. Under normal operation, traffic flows through the primary NIC
2. When the primary NIC link goes down (e.g., cable disconnected, partner interface shutdown), the backup NIC takes over automatically
3. When the primary NIC comes back up, traffic reverts to the primary NIC

### 14.5 Example Workflow

1. Create a Server with two Ethernet interfaces
2. Connect Ethernet0 to SW1 and Ethernet1 to SW2
3. Configure bond group on both interfaces
4. Shut down SW1's port — traffic automatically fails over to Ethernet1 via SW2
5. Bring SW1's port back up — traffic returns to Ethernet0

---

## 15. VPN (IPsec Tunnel) Configuration Guide

### 15.1 Overview

Configure tunnel interfaces on routers to simulate site-to-site VPN connections via IPsec tunnels. Use the "Site-to-Site VPN" template to load a pre-configured topology instantly.

### 15.2 VPN Configuration Steps

```
Router> enable
Router# configure terminal

! 1. Configure IKE policy
Router(config)# crypto isakmp policy 10
Router(config)# encryption aes
Router(config)# hash sha
Router(config)# authentication pre-share
Router(config)# group 14
Router(config)# exit

! 2. Configure IPsec transform set
Router(config)# crypto ipsec transform-set VPN-SET esp-aes esp-sha-hmac

! 3. Configure tunnel interface
Router(config)# interface tunnel 0
Router(config-if)# ip address 10.0.0.1 255.255.255.252
Router(config-if)# tunnel source GigabitEthernet0/1
Router(config-if)# tunnel destination 198.51.100.2
Router(config-if)# tunnel mode ipsec
Router(config-if)# no shutdown
Router(config-if)# exit

! 4. Configure static route for VPN traffic
Router(config)# ip route 192.168.2.0 255.255.255.0 10.0.0.2
Router(config)# end
```

### 15.3 Verifying VPN Status

```
Router# show interfaces tunnel
Router# show ip route
Router# show running-config
```

### 15.4 Testing VPN Connectivity

```
PC1# ping 192.168.2.10
PC1# show packet-flow 192.168.2.10
PC1# traceroute 192.168.2.10
```

The ping animation displays all hops including the tunnel underlay (physical path). `show packet-flow` shows the tunnel encapsulation point.

---

## 16. Canvas Zoom / Pan

### 16.1 Zoom

- **Mouse wheel up**: Zoom in (centered on cursor position)
- **Mouse wheel down**: Zoom out (centered on cursor position)
- Zoom range: **20% to 400%**
- Current zoom percentage is displayed at the **bottom-left** of the canvas

### 16.2 Pan

- **Drag on empty canvas area**: Pan the view
- **Middle mouse button drag**: Pan the view (works anywhere, even over devices)

### 16.3 Fit View

- **Double-click on empty canvas area**: Automatically adjusts zoom and pan to fit all devices in view

---

## 17. Saving and Loading Configurations

All file operations are accessed from the "**File ▾**" dropdown menu in the toolbar.

### 17.1 Manual Save

Click "File ▾" > "Save" to save all current configurations to the browser's localStorage.

### 17.2 Manual Load

Click "File ▾" > "Load" to restore the last saved configuration.

### 17.3 JSON Export

1. Click "File ▾" > "Export JSON"
2. A JSON configuration file is automatically downloaded
3. Keep this file as a backup or for use in other environments

### 17.4 JSON Import

1. Click "File ▾" > "Import JSON"
2. Select a JSON file in the file dialog
3. The configuration is loaded and the topology is restored

### 17.5 Command Script Export

1. Click "File ▾" > "Export Script"
2. A text file with CLI commands for all devices is downloaded
3. The commands can be used directly on real equipment or test environments

Example output:
```
! Device: Router1 (ROUTER) [R1]
enable
configure terminal
hostname Router1
interface GigabitEthernet0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
 exit
ip route 10.0.0.0 255.255.255.0 192.168.2.2
end
```

### 17.6 Loading from Templates

1. Click the "Templates" button in the toolbar
2. A template selection screen appears
3. Click a template to load it instantly (pre-configured with IPs, ready for testing)

Available templates:
- **Simple LAN** — R1 + SW1 + PC x3
- **Multi-Subnet Routing** — R x2 + SW x2 + PC x4
- **DMZ with Firewall** — FW + R + SW x2 + SV x2 + PC x2
- **VLAN with Inter-VLAN Routing** — R1 + SW1(VLAN10/20) + PC x4
- **NAT to Internet** — R x2 + SW + SV + PC x2
- **Site-to-Site VPN** — R x3 + SW x2 + PC x4 (IPsec tunnels, crypto pre-configured)
- **Empty Canvas** — Start from scratch

### 17.7 Reset

1. Click the "Reset" button in the toolbar
2. A confirmation dialog appears
3. Confirm to restore the default topology and settings

---

## 18. Troubleshooting

### 18.1 Ping Fails

| Check | Command |
|-------|---------|
| Is the source IP address configured? | `show ip interface brief` |
| Is the interface UP? | `show ip interface brief` |
| Does the routing table have a route to the destination? | `show ip route` |
| Is the PC's default gateway correct? | `show running-config` |
| Is an ACL blocking traffic? | `show access-lists` |
| Is a firewall policy blocking traffic? | `show firewall policy` |
| Is NAT configured correctly? | `show ip nat translations` |
| Identify the cause with packet flow diagnostics | `show packet-flow <destination-ip>` |
| Test firewall policy for specific protocol/port | `test access <destination-ip> tcp 443` |

### 18.2 VLAN Not Working

| Check | Command |
|-------|---------|
| Has the VLAN been created? | `show vlan brief` |
| Is the correct VLAN assigned to the port? | `show interfaces switchport` |
| Is the VLAN allowed on the trunk port? | `show interfaces trunk` |
| Are both ports in the same VLAN? | `show vlan brief` on both switches |
| Is ARP crossing a VLAN boundary? | `clear arp` then `ping` to observe ARP visualization |

### 18.3 NAT Not Working

| Check | Command |
|-------|---------|
| Are inside/outside interfaces configured? | `show running-config` |
| Is the ACL correctly defined? | `show access-lists` |
| Are IPs available in the NAT pool? | `show ip nat statistics` |
| Are static NAT entries correct? | `show ip nat translations` |

### 18.4 ACL Blocking Traffic

| Check | Command |
|-------|---------|
| Which ACLs are applied to which interfaces? | `show access-lists` |
| Are ACL entries in the correct order (evaluated top-down)? | `show access-lists` |
| Is there a `permit ip any any` at the end to avoid implicit deny? | `show access-lists` |
| Where exactly is the packet being blocked? | `show packet-flow <destination-ip>` |

---

## 19. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Execute command |
| **Tab** | Auto-complete command |
| **Up Arrow** | Previous command in history |
| **Down Arrow** | Next command in history |

---

## 20. Frequently Asked Questions (FAQ)

**Q: Will my configuration be lost if I close the browser?**
A: The auto-save feature preserves your configuration in localStorage. However, clearing browser data will erase it. Use JSON export to back up important configurations.

**Q: Can I use dynamic routing protocols (e.g., OSPF)?**
A: This simulator supports static routes only. Dynamic routing protocols are not available.

**Q: Is IPv6 supported?**
A: Only IPv4 is currently supported.

**Q: Is there a maximum number of devices I can add?**
A: There is no hard limit, but adding many devices may impact browser performance.

**Q: Can I share configurations with others?**
A: Yes. Export your configuration as a JSON file and have others import it.
