# Network Simulator Operation Manual

**Version:** 1.0
**Last Updated:** 2026-03-31

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
| **Canvas (left)** | Network topology visualization with devices and links |
| **Terminal (right)** | CLI command input and output |

### 3.2 Device Tabs

Device tabs appear in the header. Click a tab to switch to that device's CLI.

### 3.3 Status Colors

| Color | Meaning |
|-------|---------|
| Green | Interface UP |
| Red | Interface DOWN |
| Gray | Unconfigured |
| Purple | Trunk link |

### 3.4 Toolbar Buttons

| Button | Function |
|--------|----------|
| **Save** | Save current configuration to browser storage |
| **Load** | Load saved configuration |
| **Export** | Download configuration as JSON file |
| **Import** | Load configuration from JSON file |
| **Reset** | Reset to initial state |
| **Design Mode** | Toggle design mode |
| **Help** | Show command reference |

---

## 4. Design Mode (Topology Editing)

### 4.1 Entering Design Mode

Click the "Design Mode" button in the toolbar. A device palette appears on the left side of the screen.

### 4.2 Adding Devices

1. Drag a device (Router, Switch, Firewall, PC) from the palette
2. Drop it anywhere on the canvas
3. A name is automatically assigned (R1, SW1, FW1, PC1, etc.)

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

### 9.3 Important Notes

- Policies are evaluated in ascending sequence number order
- The first matching rule is applied
- If no rule matches, an implicit **deny all** applies
- The firewall is stateless (return traffic must also be explicitly permitted)

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

After defining an ACL, you must apply it to an interface for filtering to take effect.

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
- Standard ACLs can also be used for NAT condition matching (`ip nat inside source list`)

---

## 11. Packet Flow Diagnostics

### 11.1 The show packet-flow Command

Displays detailed decision-making at each hop as a packet travels to its destination.

```
Router# show packet-flow 10.0.0.1
```

### 11.2 Reading the Output

```
=== Packet-Flow to 10.0.0.1 ===
[R1] 192.168.1.1
  ├ Check: Is destination local? → No
  ├ NAT: No translation
  ├ Route: 10.0.0.0/24 via 192.168.2.2
  └ Forward: GigabitEthernet0/1 → R2

[R2] 192.168.2.2
  ├ Check: Is destination local? → No
  ├ Route: 10.0.0.0/24 via directly connected
  └ Forward: GigabitEthernet0/0 → destination
```

| Symbol | Meaning |
|--------|---------|
| `├` | Intermediate check |
| `└` | Forwarding decision |
| `✗` | Error (unreachable, etc.) |
| `~` | L2 switching |

---

## 12. Saving and Loading Configurations

### 12.1 Manual Save

Click the "Save" button in the toolbar to save all current configurations to the browser's localStorage.

### 12.2 Manual Load

Click the "Load" button to restore the last saved configuration.

### 12.3 JSON Export

1. Click the "Export" button in the toolbar
2. A JSON configuration file is automatically downloaded
3. Keep this file as a backup or for use in other environments

### 12.4 JSON Import

1. Click the "Import" button in the toolbar
2. Select a JSON file in the file dialog
3. The configuration is loaded and the topology is restored

### 12.5 Reset

1. Click the "Reset" button in the toolbar
2. A confirmation dialog appears
3. Confirm to restore the default topology and settings

---

## 13. Troubleshooting

### 13.1 Ping Fails

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

### 13.2 VLAN Not Working

| Check | Command |
|-------|---------|
| Has the VLAN been created? | `show vlan brief` |
| Is the correct VLAN assigned to the port? | `show interfaces switchport` |
| Is the VLAN allowed on the trunk port? | `show interfaces trunk` |
| Are both ports in the same VLAN? | `show vlan brief` on both switches |

### 13.3 NAT Not Working

| Check | Command |
|-------|---------|
| Are inside/outside interfaces configured? | `show running-config` |
| Is the ACL correctly defined? | `show access-lists` |
| Are IPs available in the NAT pool? | `show ip nat statistics` |
| Are static NAT entries correct? | `show ip nat translations` |

### 13.4 ACL Blocking Traffic

| Check | Command |
|-------|---------|
| Which ACLs are applied to which interfaces? | `show access-lists` |
| Are ACL entries in the correct order (evaluated top-down)? | `show access-lists` |
| Is there a `permit ip any any` at the end to avoid implicit deny? | `show access-lists` |
| Where exactly is the packet being blocked? | `show packet-flow <destination-ip>` |

---

## 14. Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Enter** | Execute command |
| **Tab** | Auto-complete command |
| **Up Arrow** | Previous command in history |
| **Down Arrow** | Next command in history |

---

## 15. Frequently Asked Questions (FAQ)

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
