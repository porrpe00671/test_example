class Selector {
  constructor(stage) {
    var zoomScale = 1;
    var selection = document.createElement("span");
    selection.style.position = "absolute";
    selection.style.display = "block";
    selection.style.outline = "solid 2px #00ff76";
    selection.style.pointerEvents = "none";
    document.body.appendChild(selection);

    function updateSelection(element) {
      if (element == null) {
        selection.style.display = "none";
        return;
      }
      if (element.isSameNode(stage)) {
        selection.style.display = "none";
        return;
      }

      var rect = element.getBoundingClientRect();

      selection.style.left = rect.left + "px";
      selection.style.top = rect.top + "px";
      selection.style.width = rect.width + "px";
      selection.style.height = rect.height + "px";

      selection.style.display = "block";
    }

    const view = (() => {
      const matrix = [1, 0, 0, 1, 0, 0]; // current view transform
      var m = matrix; // alias
      var scale = 1; // current scale
      const pos = { x: 0, y: 0 }; // current position of origin
      var dirty = true;
      const API = {
        applyTo(el) {
          if (dirty) {
            this.update();
          }
          var s =
            "matrix(" +
            m[0] +
            "," +
            m[1] +
            "," +
            m[2] +
            "," +
            m[3] +
            "," +
            m[4] +
            "," +
            m[5] +
            ")";
          el.setAttributeNS(null, "transform", s);
        },
        update() {
          dirty = false;
          m[3] = m[0] = scale;
          m[2] = m[1] = 0;
          m[4] = pos.x;
          m[5] = pos.y;
        },
        pan(amount) {
          if (dirty) {
            this.update();
          }
          pos.x += amount.x;
          pos.y += amount.y;
          dirty = true;
        },
        scaleAt(at, amount) {
          // at in screen coords
          if (dirty) {
            this.update();
          }
          scale *= amount;
          pos.x = at.x - (at.x - pos.x) * amount;
          pos.y = at.y - (at.y - pos.y) * amount;
          dirty = true;
        },
        getScale() {
          return scale;
        },
        getPosition() {
          return pos;
        }
      };
      return API;
    })();

    var margin = stage.getBoundingClientRect();
    view.pan({ x: 500, y: 300 });
    view.applyTo(world);
    initGrid();

    var myElement = document.getElementById("editor");
    var mc = new Hammer.Manager(myElement);
    var pinch = new Hammer.Pinch();
    var pan = new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 });
    var press = new Hammer.Press({ time: 50 });

    mc.add([pinch, pan, press]);

    mc.on("pan", function (ev) {
      mouse.oldX = mouse.x;
      mouse.oldY = mouse.y;
      mouse.x = ev.deltaX;
      mouse.y = ev.deltaY;

      if (SelectedObject.selected == null) {
        if (mouse.button) {
          view.pan({ x: mouse.x - mouse.oldX, y: mouse.y - mouse.oldY });
          view.applyTo(world);
          panGrid(view.getPosition());
        } else {
          mouse.button = true;
        }
      }
    });

    mc.on("pinch", function (ev) {
      console.textContent = "huj";
      //console.log(ev.scale);
    });
    mc.on("pressup", function (ev) {
      //console.log("pressup");
    });
    mc.on("panend", function (ev) {
      mouse.button = false;
    });

    window.addEventListener("mousemove", mouseEvent, { passive: false });
    window.addEventListener("mousedown", mouseEvent, { passive: false });
    window.addEventListener("mouseup", mouseEvent, { passive: false });
    window.addEventListener("wheel", mouseWheelEvent, { passive: false });

    const SelectedObject = { cx: 0, cy: 0, selected: null };
    const mouse = { x: 0, y: 0, oldX: 0, oldY: 0, button: false };

    function mouseEvent(event) {
      if (event.type === "mousedown" && event.button == 0) {
        SelectedObject.selected = event.target;
        SelectedObject.cx = parseFloat(
          SelectedObject.selected.getAttribute("cx")
        );
        SelectedObject.cy = parseFloat(
          SelectedObject.selected.getAttribute("cy")
        );
      }
      if (event.type === "mousedown" && event.button == 1) {
        mouse.button = true;
      }
      if (event.type === "mouseup") {
        mouse.button = false;
        SelectedObject.selected = null;
      }

      mouse.oldX = mouse.x;
      mouse.oldY = mouse.y;
      mouse.x = event.pageX - margin.left;
      mouse.y = event.pageY - margin.top;

      if (SelectedObject.selected != null) {
        SelectedObject.cx = Math.ceil(
          parseFloat(SelectedObject.selected.getAttribute("cx")) +
            (mouse.x - mouse.oldX) / view.getScale()
        );
        SelectedObject.cy = Math.ceil(
          parseFloat(SelectedObject.selected.getAttribute("cy")) +
            (mouse.y - mouse.oldY) / view.getScale()
        );
        SelectedObject.selected.setAttributeNS(null, "cx", SelectedObject.cx);
        SelectedObject.selected.setAttributeNS(null, "cy", SelectedObject.cy);

        updateSelection(SelectedObject.selected);
      }

      if (mouse.button) {
        view.pan({ x: mouse.x - mouse.oldX, y: mouse.y - mouse.oldY });
        view.applyTo(world);
        panGrid(view.getPosition());

        updateSelection(SelectedObject.selected);
      }
      event.preventDefault();
    }

    function mouseWheelEvent(event) {
      var delta = event.wheelDeltaY;
      zoomScale = delta > 0 ? 1.1 : 1 / 1.1;

      var p = stage.createSVGPoint();
      p.x = event.clientX - margin.left;
      p.y = event.clientY - margin.top;

      p = p.matrixTransform(stage.getCTM().inverse());

      view.scaleAt({ x: p.x, y: p.y }, zoomScale);
      view.applyTo(world);
      zoomGrid();
      panGrid(view.getPosition());

      updateSelection(SelectedObject.selected);

      event.preventDefault();
    }

    function getGridScale() {
      var gridScale = 1;
      while (view.getScale() * gridScale < 8) {
        gridScale *= 5;
      }
      while (view.getScale() * gridScale > 120) {
        gridScale /= 5;
      }
      return gridScale;
    }
    function zoomGrid() {
      var gridScale = (getGridScale() * 10 * view.getScale()).toString();
      gridPattern.setAttribute("width", gridScale / 2);
      gridPattern.setAttribute("height", gridScale / 2);
      gridPatternFill.setAttribute("width", gridScale / 2);
      gridPatternFill.setAttribute("height", gridScale / 2);
    }
    function panGrid(p) {
      if (p.x == undefined || p.y == undefined) return;
      gridPattern.setAttribute(
        "patternTransform",
        "translate(" + p.x + "," + p.y + ")"
      );
      crosshairs.setAttribute(
        "transform",
        "translate(" + (p.x + margin.left) + "," + (p.y + margin.top) + ")"
      );
    }
    function initGrid() {
      panGrid(view.getPosition());
      zoomGrid();
    }
  }
}
