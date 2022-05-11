class Selector {
  constructor(stage) {
    var zoomScale = 1;

    function updateSelection(element) {
      if (selection == null) return;

      if (element == null) {
        selection.style.display = "none";
        return;
      }

      if (element.classList[0] != "draggable") return;

      if (element.isSameNode(stage) && selection != null) {
        selection.style.display = "none";
        return;
      }

      selection.style.display = "block";
      margin = stage.getClientRects()[0];
      var rect = element.getClientRects()[0];
      var offsetX = rect.x - margin.x;
      var offsetY = rect.y - margin.y;

      if (offsetX != null) selection.setAttribute("x", offsetX);
      if (offsetY != null) selection.setAttribute("y", offsetY);
      if (rect.width != null) selection.setAttribute("width", rect.width);
      if (rect.height != null) selection.setAttribute("height", rect.height);
    }

    var is_touch_device = "ontouchstart" in document.documentElement;
    var margin = stage.getClientRects()[0];

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

    view.pan({ x: 300, y: 150 });
    view.applyTo(world);
    initGrid();

    var myElement = document.getElementById("editor");
    var mc = new Hammer.Manager(myElement);
    var pinch = new Hammer.Pinch();
    var pan = new Hammer.Pan({ direction: Hammer.DIRECTION_ALL, threshold: 0 });
    var press = new Hammer.Press({ time: 50 });

    mc.add([pinch, pan, press]);

    mc.on("panstart", function (ev) {
      if (!is_touch_device) return;
      reset();
      if (ev.target.classList[0] == "draggable") {
        SelectedObject.selected = ev.target;
        SelectedObject.cx = parseFloat(
          SelectedObject.selected.getAttribute("cx")
        );
        SelectedObject.cy = parseFloat(
          SelectedObject.selected.getAttribute("cy")
        );
      } else mouse.button = true;
      updateSelection(SelectedObject.selected);
    });
    mc.on("panend", function (ev) {
      if (!is_touch_device) return;
      reset();
      updateSelection(SelectedObject.selected);
    });
    mc.on("panmove", function (ev) {
      if (!is_touch_device) return;

      mouse.oldX = mouse.x;
      mouse.oldY = mouse.y;
      mouse.x = ev.deltaX;
      mouse.y = ev.deltaY;

      if (SelectedObject.selected == null) {
        if (mouse.button) {
          view.pan({ x: mouse.x - mouse.oldX, y: mouse.y - mouse.oldY });
          view.applyTo(world);
          panGrid(view.getPosition());
        }
      } else {
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
      }

      updateSelection(SelectedObject.selected);
    });

    var last = 0;
    var current = 0;
    var center = null;

    mc.on("pinchstart", function (ev) {
      if (!is_touch_device) return;
      margin = stage.getClientRects()[0];
      center = ev.center;
      center.x -= margin.x;
      center.y -= margin.y;
      SelectedObject.selected = null;
    });
    var reset = () => {
      mouse.button = false;
      center = null;
      last = 0;
      current = 0;

      SelectedObject.selected = null;

      mouse.oldX = 0;
      mouse.oldY = 0;
      mouse.x = 0;
      mouse.y = 0;

      SelectedObject.cx = 0;
      SelectedObject.cy = 0;
    };
    mc.on("pinchend", function (ev) {
      if (!is_touch_device) return;
      reset();
    });
    mc.on("pinch", function (ev) {
      if (!is_touch_device) return;
      last = current;
      current = ev.scale;

      if (center === null) return;

      zoomScale = current - last > 0 ? 1.025 : 1 / 1.025;
      view.scaleAt({ x: center.x, y: center.y }, zoomScale);
      view.applyTo(world);
      zoomGrid();
      panGrid(view.getPosition());

      SelectedObject.selected = null;
    });
    mc.on("press", function (ev) {
      if (!is_touch_device) return;
      SelectedObject.selected = null;
      if (ev.target.classList[0] == "draggable") {
        SelectedObject.selected = ev.target;
        SelectedObject.cx = parseFloat(
          SelectedObject.selected.getAttribute("cx")
        );
        SelectedObject.cy = parseFloat(
          SelectedObject.selected.getAttribute("cy")
        );

        updateSelection(SelectedObject.selected);
      }
    });
    mc.on("pressup", function (ev) {
      if (!is_touch_device) return;
      reset();
    });

    window.addEventListener("mousemove", mouseEvent, { passive: false });
    window.addEventListener("mousedown", mouseEvent, { passive: false });
    window.addEventListener("mouseup", mouseEvent, { passive: false });
    window.addEventListener("wheel", mouseWheelEvent, { passive: false });

    const SelectedObject = { cx: 0, cy: 0, selected: null };
    const mouse = { x: 0, y: 0, oldX: 0, oldY: 0, button: false };

    //mouse pan
    function mouseEvent(event) {
      if (is_touch_device) return;

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
      margin = stage.getClientRects()[0];
      mouse.oldX = mouse.x;
      mouse.oldY = mouse.y;
      mouse.x = event.pageX - margin.x;
      mouse.y = event.pageY - margin.y;

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

    //mouse zoom
    function mouseWheelEvent(event) {
      margin = stage.getClientRects()[0];
      var delta = event.wheelDeltaY;
      zoomScale = delta > 0 ? 1.1 : 1 / 1.1;

      var p = { x: 0, y: 0 };
      p.x = event.clientX - margin.x;
      p.y = event.clientY - margin.y;

      view.scaleAt({ x: p.x, y: p.y }, zoomScale);
      view.applyTo(world);
      zoomGrid();
      panGrid(view.getPosition());

      updateSelection(SelectedObject.selected);

      event.preventDefault();
    }

    //Grid
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
      margin = stage.getClientRects()[0];
      if (p.x == undefined || p.y == undefined) return;
      gridPattern.setAttribute(
        "patternTransform",
        "translate(" + p.x + "," + p.y + ")"
      );
      crosshairs.setAttribute(
        "transform",
        "translate(" + (p.x + margin.x) + "," + (p.y + margin.y) + ")"
      );
    }
    function initGrid() {
      panGrid(view.getPosition());
      zoomGrid();
    }
  }
}
