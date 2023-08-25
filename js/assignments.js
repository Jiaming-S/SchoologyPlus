(async function () {
  // Wait for loader.js to finish running
  while (!window.splusLoaded) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await loadDependencies("assignments", ["all"]);
})();

/**
 * Searches through all assignments of all sections for the corresponding section that matches an assignment
 * @param {*} assignment_id id of the assignment to get the section of
 * @returns the section object that contains an assignment of assignment_id
 */
async function getCorrespondingSection (assignment_id){
  const allSections = (await fetchApiJson(`users/${getUserId()}/sections`)).section;

  for (const curSection of allSections){
    const curSectionAssignments = (await fetchApiJson(`sections/${curSection.id}/assignments/?start=0&limit=999`)).assignment;
    if (!curSectionAssignments) continue;

    for (const assignment of curSectionAssignments) {
      if (assignment.id === assignment_id){
        return curSection;
      }
    }
  }
} 

/**
 * Gets the assignment given assignment_id and optionally the section it belongs to
 * @param {*} assignment_id assignment_id of the assignment to get
 * @param {*} section (optional) the section that contains the assignment
 * @returns the current assignment object
 */
async function getAssignment(assignment_id, section) {
  if (section) {
    return await fetchApiJson(`sections/${section.id}/assignments/${assignment_id}`);
  }
  if (!section)  {
    return await getCorrespondingSection(assignment_id)
      .then((section) => {
        return fetchApiJson(`sections/${section.id}/assignments/${assignment_id}`)
      })
      .then((assignment) => { 
        return assignment;
      })
      .catch((error) => {
        console.error("Something broke:", error);
      });
  }
}

function sectionIDMatch (a, b){
  return a.substring(0, 4) == b.substring(0, 4);;
}

function gradingPeriodContainsAssignment (grading_period, assignment_id){
  return grading_period.assignment.find((A) => A.assignment_id == assignment_id) !== undefined;
}
  
async function displayAssignmentSignificance() {
  const url = window.location.href;
  const assignment_id = parseInt(url.match(/(\d+)/g)[0]);

  const curSection = (await getCorrespondingSection(assignment_id));
  const curAssignment = (await getAssignment(assignment_id, curSection));

  const curAssignmentPoints = parseInt(curAssignment.max_points);
  const curAssignmentGradingCategory = curAssignment.grading_category;


  const allGrades = await fetchApiJson(`users/${getUserId()}/grades`);
  const sectionGrades = allGrades.section.find((S) => sectionIDMatch(S.section_id, curSection.course_id));
  const relevantGradingPeriod = sectionGrades.period.find((P) => gradingPeriodContainsAssignment(P, assignment_id));
  const relevantGradingPeriodGrades = sectionGrades.final_grade.find((G) => G.period_id == relevantGradingPeriod.period_id);
  const relevantGradingCategory = relevantGradingPeriodGrades.grading_category.find((C) => C.category_id == curAssignmentGradingCategory);
  const relevantGradingCategoryName = sectionGrades.grading_category.find((C) => C.id == curAssignmentGradingCategory).title;

  let curPoints = 0;
  let curTotalPoints = 0;
  for (const assignment of relevantGradingPeriod.assignment) {
    if (assignment.grade !== null && assignment.max_points > 0 && assignment.category_id == curAssignmentGradingCategory) { 
      curPoints += parseInt(assignment.grade);
      curTotalPoints += parseInt(assignment.max_points);
    }
  }

  const curPercent = (curPoints / curTotalPoints * 100).toPrecision(3);
  const newPercent = ((curPoints + curAssignmentPoints) / (curTotalPoints + curAssignmentPoints) * 100).toPrecision(3);

  const btnText = `${relevantGradingCategoryName}: ${curPercent}% → ${newPercent}%`;

  // create button and wrapper to display significance
  const container = createButton("significance-info-btn", btnText); 
  const wrapper = createElement("div", ["splus-assignment-significance"]);
  wrapper.appendChild(container);
  document.querySelector(".info-container")?.appendChild(wrapper);
  const button = document.querySelector("#significance-info-btn").parentElement;
  const hue = Math.max(5 - (newPercent - curPercent), 0) / 5 * 120; 
  button.setAttribute("style",  `border: 2px solid hsl(${hue}, 100%, 20%) !important; background-color: hsl(${hue}, 100%, 10%) !important;`)
}

(async () => {
  await displayAssignmentSignificance();
})();

Logger.debug("Finished loading assignments.js");
