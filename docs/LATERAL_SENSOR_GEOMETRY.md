# Phase IV-B: Physical Lateral Sensor Geometry & Receptor Mapping Specification
## Standardized Sensory Embodiment for the Connectome Rover

### 1. Architectural Philosophy

Prior experimental phases (Phases II and III) evaluated the Drosophila connectome entity under an artificial sensory bottleneck: **100% rotational symmetry**. Even when the rover was positioned adjacent to an obstacle on its left flank, the sensory interface computed scalar distances and delivered identical, bilateral excitation to both hemispheres:
$$S_{\text{left}} = S_{\text{right}} = f(\text{nearest\_obstacle\_distance})$$

Under bilateral symmetry, ipsilateral and contralateral steering descending neurons (`DNa02`, `DNa01`, `DNp09`) fire symmetrically, canceling net steering torque:
$$\Delta \text{turn} = \text{turnL} - \text{turnR} \approx 0$$
This suppressed directional discovery and forced the entity into symmetric aversive halt/MDN responses.

To resolve this bottleneck under strict causal integrity, we define a **physically grounded lateral sensor geometry**. Directional information arises solely from simulated physical raycasting and contact sensor poses.

---

### 2. Physical Sensor Poses & Raycasting Geometry

The rover is equipped with bilateral sensory apparatus configured symmetrically about its forward heading vector $\vec{h}$:

```
                 Front Ray (0°)
                      │
   Left Antenna (-45°)│   Right Antenna (+45°)
             \        │        /
              \       │       /
               \      │      /
    Left Flank  ──────[ROVER]──────  Right Flank
      (-90°)          │              (+90°)
```

#### Sensor Pose Definitions:
1. **Forward Ray ($\theta = 0^\circ$):**
   Raycast vector $\vec{r}_{\text{front}} = \vec{h}$. Range $R_{\max} = 6.0$ units.
2. **Left Antenna Ray ($\theta = -45^\circ$):**
   Raycast vector rotated $45^\circ$ counter-clockwise from heading. Range $R_{\max} = 6.0$ units.
3. **Right Antenna Ray ($\theta = +45^\circ$):**
   Raycast vector rotated $45^\circ$ clockwise from heading. Range $R_{\max} = 6.0$ units.
4. **Left Flank Tactile Probe ($\theta = -90^\circ$):**
   Raycast vector orthogonal to heading on the left side. Range $R_{\max} = 3.0$ units.
5. **Right Flank Tactile Probe ($\theta = +90^\circ$):**
   Raycast vector orthogonal to heading on the right side. Range $R_{\max} = 3.0$ units.

#### Physical Distance Response Curves:
Antennal deflection is modeled via the standard biophysical Hill equation:
$$\text{deflection}(d) = \begin{cases} 
\text{Hill}\left(\frac{R_{\max} - d}{R_{\max}}, k=0.4, n=1.4\right) & \text{if } d \le R_{\max} \\
0 & \text{if } d > R_{\max}
\end{cases}$$

---

### 3. Biological Receptor Mapping

Physical signals transduce into verified biological sensory populations in `bodymap.json`:

| Physical Measurement | Biological Receptor Population | Functional Modality | Peak Firing Rate |
| :--- | :--- | :--- | :---: |
| **Left Antenna Deflection** ($d_{\text{left}} < 2.5$) | `JO wind/gravity left` | Johnston's Organ mechanoreceptors | $120.0\text{ Hz}$ |
| **Right Antenna Deflection** ($d_{\text{right}} < 2.5$) | `JO wind/gravity right` | Johnston's Organ mechanoreceptors | $120.0\text{ Hz}$ |
| **Left Physical Contact** ($d_{\text{left}} \le 1.0$) | `tactile T1 left` | Foreleg mechanosensory bristles | $160.0\text{ Hz}$ |
| **Right Physical Contact** ($d_{\text{right}} \le 1.0$) | `tactile T1 right` | Foreleg mechanosensory bristles | $160.0\text{ Hz}$ |
| **Left Noxious / Thermal Gradient** | `thermosensory left` | Cold/Warm Arista sensory neurons | $180.0\text{ Hz}$ |
| **Right Noxious / Thermal Gradient** | `thermosensory right` | Cold/Warm Arista sensory neurons | $180.0\text{ Hz}$ |
| **Forward Looming Threat** ($d_{\text{front}} < 1.0$) | `photoreceptors` (Visual Loom) | Compound eye ommatidia | $65.0\text{ Hz}$ |

#### Non-Cross-Wired Integrity:
- Left sensors transduce **only** to left-hemisphere biological receptors.
- Right sensors transduce **only** to right-hemisphere biological receptors.
- No artificial inversion, steering injection, or coordinate hints exist in transduction.
- All neural routing and bilateral torque integration occur inside the 165,122-neuron recurrent connectome.

---

### 4. Absence of Subjective "Pain" Terminology

In strict adherence to project standards, all high-intensity stimuli are denoted as:
- **Aversive drive**
- **Noxious stimulus**
- **High-threshold sensory excitation**

Subjective affective terms (e.g. "pain", "suffering") are prohibited.
