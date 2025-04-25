# RoboTrace #

<table>
  <tr>
    <td>
      RoboTrace is a graphical interface to handle robotic system data and analyze them with process mining techniques. This repository contains the tool for performing the process mining-based analysis to discover robots behavior via a DFG enhanced with contextual perspectives.
    </td>
    <td>
      <img src="/static/images/robotrace.png" alt="RoboTraceLogo" width="150"/>
    </td>
  </tr>
</table>


## Installation
```bash
git clone <repository_link>
```

```bash
cd /<path>/robotrace
```

### Docker
```bash
docker build -t robotrace .
```

```bash
docker-compose up --build
```

Then open your browser at: http://localhost:8080

### Source Code

#### Requirements
- Python 3.8 or later

#### Python dependecies installation

**Create a virtual environment**
```bash
python -m venv .venv
```

**Activate the virtual environment**

_Windows_
```bash
.venv\Scripts\activate
```

_macOS and Linux_

```bash
source .venv/bin/activate
```

**Install dependencies**

* Install Graphviz (pm4py requirement) 🔗 [here](https://graphviz.org/download/)

* Install Python dependencies:

    ```bash
    pip install -r requirements.txt
    ```

#### Run
```bash
python3 main.py  
```



## References
* Corradini, F., Pettinari, S., Re, B., Rossi, L., Tiezzi, F. (2024). A Methodology for the Analysis of Robotic Systems via Process Mining. In: Enterprise Design, Operations, and Computing. EDOC 2023. Lecture Notes in Computer Science, vol 14367. Springer. [[🔗 website](https://pros.unicam.it/tale/)] [[📃 paper](https://link.springer.com/chapter/10.1007/978-3-031-46587-1_7)]


## More Info
Check out the 📘 [wiki](https://github.com/SaraPettinari/robotrace/wiki) for detailed documentation and usage examples

## Contact
✉️ Sara Pettinari (Gran Sasso Science Institute) - sara.pettinari@gssi.it