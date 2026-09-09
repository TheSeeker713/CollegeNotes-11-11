# Proposed visual-aid inspector

Learning question: can the learner identify when the text in their own visual aid becomes difficult to distinguish at a smaller apparent viewing size? This is an instructional comparison, not a validated simulator of a particular classroom or a predicted instructor grade.

Proposed state: selected user slide, relative viewing-size value, compared versions, learner prediction and observation. Actions: change viewing size, compare before/after, reset, switch to 2D. Explanation refers to actual displayed state. Save comparison/prediction without altering the original slide.

Optional embedded 3D uses a flat slide plane and controlled camera distance to vary apparent size; no free navigation, room, audience, ocean or decorative assets. Proposed scene budget is under 5,000 triangles, 20 draw calls and 8 MiB textures, within the Phase 0 ceiling. Pause rendering when inactive. These are unmeasured proposal values; exact workload is frozen only after owner design review.

Keyboard sliders/buttons perform every action. A 2D scaled comparison with full-size text and clear explanation is always available, including GPU failure/context loss. Do not claim actual optical acuity or legibility for a real audience from a mockup.

S13 requests three images of the initial, changed and graphics-disabled states. Owner review must establish usefulness before the Phase 12 implementation. No scene or WebGL implementation exists in this phase.
