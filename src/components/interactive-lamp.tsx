"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import Matter from "matter-js";
import { setBob } from "@/components/lamp/lamp-store";

/**
 * Interactive physics pendulum lamp (Layer 1-3).
 *
 * - matter-js drives a stiff chain (anchor -> links -> bob) under real gravity.
 * - The bob is magnetically attracted to the cursor within MAGNET_RADIUS.
 * - The bob is grab/throw-able via a pointer constraint (page stays interactive
 *   because the canvas itself is pointer-events:none and we only capture the
 *   pointer once a grab actually starts on the bob).
 * - Dragging the bob below PULL_DISTANCE past its rest point toggles the theme,
 *   once per pull, with a tactile downward snap.
 *
 * The bob's live viewport position is published to the lamp-store so the
 * pretext text-wrapper can exclude it as a moving obstacle (Layer 4).
 */

const LINK_COUNT = 6;
const LINK_SPACING = 22;
const LINK_RADIUS = 3;
const BOB_RADIUS = 15;
const MAGNET_RADIUS = 200;
// accel = MAGNET_STRENGTH * falloff (mass cancels). Matter's gravity accel is
// ~0.001, so this gives a pull up to ~3.5x gravity near the cursor: a strong,
// snappy attraction (radius stays at MAGNET_RADIUS).
const MAGNET_STRENGTH = 0.0016;
const PULL_DISTANCE = 160; // how far below rest the cursor must pull to toggle
const ANCHOR_Y = 10;

/** Right edge of the centered `max-w-2xl px-6` content column. */
function getContentLeft() {
  const COLUMN = 672; // max-w-2xl = 42rem
  const PADDING = 24; // px-6
  const rightEdge = (window.innerWidth - COLUMN) / 2 + COLUMN - PADDING;
  // clamp so the lamp stays on-screen on narrow/mobile viewports (where the
  // column is wider than the screen); desktop is unaffected.
  return Math.min(rightEdge, window.innerWidth - PADDING);
}

export function InteractiveLamp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // mobile-only touch target that tracks the bob; its `touch-action: none`
  // lets a touch starting on the bob drag it instead of scrolling the page.
  const padRef = useRef<HTMLDivElement>(null);
  const { setTheme, resolvedTheme } = useTheme();
  // keep latest theme in a ref so the physics loop doesn't need to re-bind
  const themeRef = useRef(resolvedTheme);
  themeRef.current = resolvedTheme;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pad = padRef.current;

    const {
      Engine,
      Runner,
      Composite,
      Bodies,
      Body,
      Constraint,
      Vector,
      Events,
    } = Matter;

    // ---- Layer 1: engine + chain --------------------------------------
    // more constraint iterations keep the chain taut (rigid-looking) instead of
    // rubber-banding when the magnet/drag tugs on it.
    const engine = Engine.create({ constraintIterations: 4 });
    engine.gravity.y = 1;

    let anchorX = getContentLeft();

    // invisible chain links + bob share a negative collision group so they
    // never collide with each other (prevents jitter).
    const noCollide = { group: Body.nextGroup(true) };

    const anchor = Bodies.circle(anchorX, ANCHOR_Y, LINK_RADIUS, {
      isStatic: true,
      collisionFilter: noCollide,
    });

    const links: Matter.Body[] = [];
    for (let i = 0; i < LINK_COUNT; i++) {
      links.push(
        Bodies.circle(anchorX, ANCHOR_Y + (i + 1) * LINK_SPACING, LINK_RADIUS, {
          collisionFilter: noCollide,
          frictionAir: 0.02,
        })
      );
    }

    const bob = Bodies.circle(
      anchorX,
      ANCHOR_Y + (LINK_COUNT + 1) * LINK_SPACING,
      BOB_RADIUS,
      {
        collisionFilter: noCollide,
        density: 0.02, // heavier than the links
        frictionAir: 0.02, // air drag so the swing settles in ~3s, not forever
        restitution: 0.4,
      }
    );

    const chain = [anchor, ...links, bob];
    const constraints: Matter.Constraint[] = [];
    for (let i = 0; i < chain.length - 1; i++) {
      constraints.push(
        Constraint.create({
          bodyA: chain[i],
          bodyB: chain[i + 1],
          length: LINK_SPACING,
          // near-rigid so the chain stays taut and swings on an arc toward the
          // cursor rather than stretching like a rubber band. The toggle keys
          // off the drag pointer, so it doesn't need a stretchy chain.
          stiffness: 0.50,
          damping: 0.08,
        })
      );
    }

    Composite.add(engine.world, [...chain, ...constraints]);

    const restY = () => ANCHOR_Y + (LINK_COUNT + 1) * LINK_SPACING;

    // ---- Layer 2: cursor tracking, magnet, grab/throw -----------------
    const mouse = { x: -9999, y: -9999, down: false };
    let dragConstraint: Matter.Constraint | null = null;
    let activePointerId: number | null = null;
    // toggle gesture state: armed on each fresh grab, spends itself on one pull
    let armed = true;

    const onPointerMove = (e: PointerEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (dragConstraint) {
        dragConstraint.pointA = { x: e.clientX, y: e.clientY };
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      const d = Vector.magnitude(
        Vector.sub({ x: e.clientX, y: e.clientY }, bob.position)
      );
      // only hijack the pointer if the grab starts on the bob, so links/buttons
      // elsewhere on the page keep working normally.
      if (d > BOB_RADIUS + 14) return;
      mouse.down = true;
      activePointerId = e.pointerId;
      armed = true; // every fresh grab can toggle once
      dragConstraint = Constraint.create({
        pointA: { x: e.clientX, y: e.clientY },
        bodyB: bob,
        pointB: { x: 0, y: 0 },
        stiffness: 0.9,
        damping: 0.1,
        length: 0,
      });
      Composite.add(engine.world, dragConstraint);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (activePointerId !== null && e.pointerId !== activePointerId) return;
      mouse.down = false;
      activePointerId = null;
      if (dragConstraint) {
        Composite.remove(engine.world, dragConstraint);
        dragConstraint = null;
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    window.addEventListener("pointercancel", onPointerUp, { passive: true });

    // magnetic attraction
    Events.on(engine, "beforeUpdate", () => {
      if (dragConstraint) return;
      const toMouse = Vector.sub(mouse, bob.position);
      const dist = Vector.magnitude(toMouse);
      if (dist > 1 && dist < MAGNET_RADIUS) {
        // falloff: stronger when closer
        const falloff = 1 - dist / MAGNET_RADIUS;
        const f = MAGNET_STRENGTH * bob.mass * falloff;
        Body.applyForce(bob, bob.position, {
          x: (toMouse.x / dist) * f,
          y: (toMouse.y / dist) * f,
        });
      }
    });

    // ---- Layer 3: theme toggle on pull --------------------------------
    // The chain isn't perfectly rigid, so under gravity it sags well past its
    // nominal length: the bob actually hangs ~70px lower than restY() suggests.
    // We therefore learn the TRUE resting y at runtime (when the bob is idle and
    // clear of the magnet) and measure the pull from there. Using the nominal
    // restY() would put the toggle line above the bob's rest, firing on the very
    // first grab and never re-arming.
    let restBaselineY = restY();

    // A deliberate "pull the cord down" gesture: fire only while actively
    // dragging, keyed off the drag pointer alone (NOT the bob's own y, which
    // would also fire on release momentum and make the toggle nondeterministic).
    // Each grab is armed once; the pointer can ease back up and pull again to
    // toggle repeatedly within a single drag.
    Events.on(engine, "afterUpdate", () => {
      // refresh the rest baseline while the bob hangs freely & still
      const idle =
        !dragConstraint &&
        Vector.magnitude(bob.velocity) < 0.4 &&
        Vector.magnitude(Vector.sub(mouse, bob.position)) > MAGNET_RADIUS;
      if (idle) restBaselineY = bob.position.y;

      if (dragConstraint) {
        const threshold = restBaselineY + PULL_DISTANCE;
        const pointerY = dragConstraint.pointA.y;
        if (pointerY > threshold && armed) {
          armed = false;
          setTheme(themeRef.current === "dark" ? "light" : "dark");
          // tactile snap: a downward kick that the chain springs back from
          Body.setVelocity(bob, { x: bob.velocity.x, y: 14 });
        } else if (pointerY < threshold - 50) {
          armed = true; // eased back up → can toggle again on the next pull
        }
      }

      // publish live bob position for the pretext obstacle
      setBob({
        x: bob.position.x,
        y: bob.position.y,
        r: BOB_RADIUS,
        active: !!dragConstraint || bob.position.y > restBaselineY + 40,
      });
    });

    // ---- Layer 1: canvas sizing + render loop -------------------------
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // re-anchor to the (possibly shifted) content margin
      anchorX = getContentLeft();
      Body.setPosition(anchor, { x: anchorX, y: ANCHOR_Y });
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const draw = () => {
      const dark = themeRef.current === "dark";
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // chain
      ctx.beginPath();
      ctx.moveTo(anchor.position.x, anchor.position.y);
      for (const l of links) ctx.lineTo(l.position.x, l.position.y);
      ctx.lineTo(bob.position.x, bob.position.y);
      ctx.lineWidth = 2;
      ctx.strokeStyle = dark
        ? "rgba(180,180,190,0.85)"
        : "rgba(90,90,100,0.75)";
      ctx.lineCap = "round";
      ctx.stroke();

      // ceiling mount
      ctx.fillStyle = dark ? "#4b5563" : "#9ca3af";
      ctx.fillRect(anchor.position.x - 10, 0, 20, 6);

      // bob glow
      const { x, y } = bob.position;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, BOB_RADIUS * 2.6);
      const lit = dark ? "250,204,21" : "234,179,8";
      glow.addColorStop(0, `rgba(${lit},0.55)`);
      glow.addColorStop(1, `rgba(${lit},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, BOB_RADIUS * 2.6, 0, Math.PI * 2);
      ctx.fill();

      // bob body
      const body = ctx.createRadialGradient(
        x - 4,
        y - 4,
        2,
        x,
        y,
        BOB_RADIUS
      );
      body.addColorStop(0, dark ? "#fde68a" : "#fcd34d");
      body.addColorStop(1, dark ? "#f59e0b" : "#d97706");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, BOB_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = dark ? "#fbbf24" : "#b45309";
      ctx.stroke();

      // sun / moon glyph
      ctx.fillStyle = "#1f2937";
      ctx.font = `${BOB_RADIUS}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(dark ? "☾" : "☀", x, y + 1);

      // keep the mobile touch-pad centered on the bob (grab radius = 29px)
      if (pad) pad.style.transform = `translate(${x - 29}px, ${y - 29}px)`;

      raf = requestAnimationFrame(draw);
    };
    draw();

    const runner = Runner.create();
    Runner.run(runner, engine);

    // ---- cleanup ------------------------------------------------------
    return () => {
      cancelAnimationFrame(raf);
      Runner.stop(runner);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      setBob({ x: -9999, y: -9999, r: 0, active: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-40 block"
      />
      {/* mobile-only grab target: 58px (matches the 29px grab radius), no
          visual, suppresses page scroll only while touching the bob */}
      <div
        ref={padRef}
        aria-hidden
        className="fixed left-0 top-0 z-50 h-[58px] w-[58px] touch-none md:hidden"
      />
    </>
  );
}
