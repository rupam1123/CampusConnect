const Project = require("../models/Project");
const Application = require("../models/Application");

// --- PROFESSOR ACTIONS ---
exports.createProject = async (req, res) => {
  try {
    const { title, description, branches, batches, cpi, skills, duration } = req.body;

    if (!title || !title.trim())
      return res.status(400).json({ msg: "Project title is required." });
    if (!description || !description.trim())
      return res.status(400).json({ msg: "Project description is required." });
    if (!branches || branches.length === 0)
      return res.status(400).json({ msg: "At least one branch must be selected." });
    if (!batches || batches.length === 0)
      return res.status(400).json({ msg: "At least one batch must be selected." });
    if (cpi === undefined || cpi === null || cpi === "")
      return res.status(400).json({ msg: "Minimum CPI is required." });
    if (!Number.isFinite(Number(cpi)) || Number(cpi) < 0 || Number(cpi) > 10)
      return res.status(400).json({ msg: "CPI must be between 0 and 10." });

    const project = await Project.create({
      title: title.trim(),
      description: description.trim(),
      branches,
      batches,
      cpi: parseFloat(cpi),
      skills: skills ? skills.trim() : "",
      duration: duration ? duration.trim() : "",
      professor: req.user.id,
    });
    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error creating project." });
  }
};

exports.getProfProjects = async (req, res) => {
  try {
    const projects = await Project.find({ professor: req.user.id }).sort({ createdAt: -1 });
    const projectsWithApps = await Promise.all(
      projects.map(async (p) => {
        const applicants = await Application.find({ project: p._id });
        return { ...p._doc, applicants };
      })
    );
    res.json(projectsWithApps);
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching projects." });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found." });
    if (project.professor.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized to edit this project." });

    const { title, description, branches, batches, cpi, skills, duration } = req.body;

    if (!title || !title.trim())
      return res.status(400).json({ msg: "Project title is required." });
    if (!description || !description.trim())
      return res.status(400).json({ msg: "Project description is required." });
    if (!branches || branches.length === 0)
      return res.status(400).json({ msg: "At least one branch must be selected." });
    if (!batches || batches.length === 0)
      return res.status(400).json({ msg: "At least one batch must be selected." });
    if (cpi === undefined || cpi === null || cpi === "")
      return res.status(400).json({ msg: "Minimum CPI is required." });
    if (!Number.isFinite(Number(cpi)) || Number(cpi) < 0 || Number(cpi) > 10)
      return res.status(400).json({ msg: "CPI must be between 0 and 10." });

    const updated = await Project.findByIdAndUpdate(
      req.params.id,
      {
        title: title.trim(),
        description: description.trim(),
        branches,
        batches,
        cpi: parseFloat(cpi),
        skills: skills ? skills.trim() : "",
        duration: duration ? duration.trim() : "",
      },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error updating project." });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found." });
    if (project.professor.toString() !== req.user.id)
      return res.status(403).json({ msg: "Not authorized to delete this project." });

    await Application.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ msg: "Project and all applications deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error deleting project." });
  }
};

exports.updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Accepted', 'Rejected', 'Pending'].includes(status)) return res.status(400).json({ msg: 'Invalid application status' });
    const existing = await Application.findById(req.params.appId);
    if (!existing) return res.status(404).json({ msg: 'Application not found' });
    const project = await Project.findById(existing.project);
    if (!project || String(project.professor) !== String(req.user.id)) return res.status(403).json({ msg: 'Not authorized to review this application' });
    const application = await Application.findByIdAndUpdate(
      req.params.appId,
      { status },
      { new: true }
    );
    res.json({ msg: `Application ${status}`, application });
  } catch (err) {
    res.status(500).json({ msg: "Server error updating status." });
  }
};

// --- STUDENT ACTIONS ---
exports.getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find({ status: "Open" }).populate("professor", "name email");
    res.json(projects);
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching projects." });
  }
};

exports.applyForProject = async (req, res) => {
  try {
    const { rollNo, name, branch, batch, cpi, resume } = req.body;

    if (!rollNo || !name || !branch || !batch || cpi === undefined || cpi === null || !resume)
      return res.status(400).json({ msg: "All fields are required." });
    if (!/^\d+$/.test(rollNo.toString()))
      return res.status(400).json({ msg: "Roll number must be digits only." });
    if (!/^[a-zA-Z\s&]+$/.test(branch))
      return res.status(400).json({ msg: "Branch must contain only letters." });

    const cpiNum = parseFloat(cpi);
    if (isNaN(cpiNum) || cpiNum < 0 || cpiNum > 10)
      return res.status(400).json({ msg: "CPI must be between 0 and 10." });

    const project = await Project.findById(req.params.projectId);
    if (!project) return res.status(404).json({ msg: "Project not found." });

    if (project.status !== 'Open') return res.status(400).json({ msg: 'This project is closed' });
    try { if (!['http:', 'https:'].includes(new URL(resume).protocol)) throw new Error(); }
    catch { return res.status(400).json({ msg: 'Resume must be an HTTP or HTTPS link' }); }
    if (cpiNum < project.cpi)
      return res.status(400).json({ msg: `Your CPI (${cpiNum}) is below the minimum required CPI of ${project.cpi}.` });

    if (!project.branches.includes("ALL") && !project.branches.map(b => b.toLowerCase()).includes(branch.trim().toLowerCase()))
      return res.status(400).json({ msg: `This project is only open to: ${project.branches.join(", ")}.` });

    if (!project.batches.includes("ALL") && !project.batches.includes(batch.trim()))
      return res.status(400).json({ msg: `This project is only open to batches: ${project.batches.join(", ")}.` });

    const existing = await Application.findOne({ project: req.params.projectId, student: req.user.id });
    if (existing) return res.status(400).json({ msg: "You have already applied for this project." });

    const application = await Application.create({
      rollNo: rollNo.toString(),
      name: name.trim(),
      branch: branch.trim(),
      batch: batch.trim(),
      cpi: cpiNum,
      resume,
      project: req.params.projectId,
      student: req.user.id,
    });
    res.status(201).json({ msg: "Application submitted successfully!", application });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error submitting application." });
  }
};

exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user.id }).select("project status");
    res.json(applications);
  } catch (err) {
    res.status(500).json({ msg: "Server error fetching applications." });
  }
};
