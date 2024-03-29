const express = require("express");
const dotenv = require("dotenv").config();
const { verifyToken, verifyManager } = require("../../middlewares/auth");
const { ObjectId } = require("mongodb");
const { mongoClient } = require("../../database");

const db = mongoClient.db("news");
const blogs = db.collection("news-blogs");
const extras = db.collection("news-extras");
const app = express.Router();

app.post("/create-blog", verifyToken, verifyManager, async (req, res) => {
  if (!req.body.blogDetails) {
    return res
      .status(400)
      .json({ message: "Missing fields for creating blog." });
  }
  const blogDetails = req.body.blogDetails;
  try {
    const blog_obj = {
      ...blogDetails,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: true,
    };
    const newBlog = await blogs.insertOne(blog_obj);
    return res
      .status(200)
      .json({ message: "Successfully created blog", newBlog });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.get("/getBlogById/:id", async (req, res) => {
  const blogId = req.params["id"];
  try {
    const query = { _id: new ObjectId(blogId) };
    const blog = await blogs.findOne(query);
    if (!blog) {
      return res.status(400).json({ message: "Blog does not exist." });
    }
    if (!blog.status) {
      return res.status(400).json({ message: "Blog is not active." });
    }
    res.status(200).json({ message: "Found blog with this id.", blog });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.get("/getRecent", async (req, res) => {
  try {
    const blogs_pointer = blogs.find();
    const blogs_list = [];
    for await (const blog of blogs_pointer) {
      if (blog.status) {
        blogs_list.push(blog);
      }
    }
    blogs_list.sort((a, b) => b.createdAt - a.createdAt);
    res
      .status(200)
      .json({ message: "Found blogs.", result: blogs_list.slice(0, 5) });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.get("/getBlogsByTag/:tag", async (req, res) => {
  const tag = req.params["tag"];
  const tags = [
    "national",
    "state",
    "crime",
    "politics",
    "sports",
    "business",
    "employment",
    "entertainment",
    "health",
    "spiritual",
    "media",
    "author",
    "viral",
    "podcast",
  ];
  if (!tags.includes(tag)) {
    return res.status(400).json({ message: "Use Correct tag." });
  }
  try {
    const blogs_pointer = blogs.find();
    const blogs_list = [];
    for await (const blog of blogs_pointer) {
      if (blog.tags.includes(tag)) {
        if (blog.status) {
          blogs_list.push(blog);
        }
      }
    }
    blogs_list.sort((a, b) => b.createdAt - a.createdAt);
    res
      .status(200)
      .json({ message: "Found blogs with this id.", result: blogs_list });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.post("/getAllBlogs", verifyToken, verifyManager, async (req, res) => {
  try {
    const blogs_pointer = blogs.find();
    const blogs_list = [];
    for await (const blog of blogs_pointer) {
      blogs_list.push(blog);
    }
    blogs_list.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({ message: "Found blogs.", result: blogs_list });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.post("/updateBlog", verifyToken, verifyManager, async (req, res) => {
  if (!req.body.blogId || !req.body.tags || req.body.status === undefined) {
    return res
      .status(400)
      .json({ message: "Missing fields for updating blog." });
  }
  const blogId = req.body.blogId;
  const status = req.body.status;
  const tags = req.body.tags;
  try {
    const query = { _id: new ObjectId(blogId) };
    const old_blog = await blogs.findOne(query);
    if (!old_blog) {
      return res.status(400).json({ message: "Blog does not exist." });
    }
    const update = {
      $set: {
        status,
        tags,
      },
    };
    const options = { upsert: false };
    const result = await blogs.updateOne(query, update, options);
    const { matchedCount, modifiedCount } = result;
    if (matchedCount !== modifiedCount) {
      return res.status(400).json({
        message: "Update went wrong.",
      });
    }
    res.status(200).json({ message: "Blog Updated." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.post("/deleteBlog", verifyToken, verifyManager, async (req, res) => {
  if (!req.body.blogId) {
    return res
      .status(400)
      .json({ message: "Missing fields for deleting blog." });
  }
  const blogId = req.body.blogId;
  try {
    const query = { _id: new ObjectId(blogId) };
    const old_blog = await blogs.deleteOne(query);
    if (old_blog.deletedCount !== 1) {
      return res.status(400).json({ message: "Blog does not exist." });
    }
    res.status(200).json({ message: "Blog Deleted." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.get("/getYtList", async (req, res) => {
  try {
    const query = { title: "yt_carousel_list" };
    const result = await extras.findOne(query);
    if (result) {
      return res
        .status(200)
        .json({ message: "List found.", list: result.list });
    }
    res.status(200).json({ message: "List not found.", list: [] });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.post("/updateYtList", verifyToken, verifyManager, async (req, res) => {
  if (!req.body.list) {
    return res.status(400).json({ message: "Missing new list." });
  }
  const list = req.body.list;
  try {
    const query = { title: "yt_carousel_list" };
    const update = {
      $set: {
        list,
      },
    };
    const options = { upsert: false };
    const result = await extras.updateOne(query, update, options);
    const { matchedCount, modifiedCount } = result;
    if (matchedCount !== modifiedCount) {
      return res.status(400).json({
        message: "Update went wrong.",
      });
    }
    res.status(200).json({ message: "List Updated." });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

app.post("/searchBlogs", async (req, res) => {
  if (!req.body.query) {
    return res.status(400).json({ message: "Missing query." });
  }
  try {
    const query = req.body.query;
    const blogs_pointer = blogs.find();
    const blogs_list = [];
    for await (const blog of blogs_pointer) {
      if (blog.status) {
        if (
          blog?.heading?.includes(query) ||
          blog?.subHeading?.includes(query) ||
          blog?.text_section_1?.includes(query) ||
          blog?.text_section_2?.includes(query)
        ) {
          blogs_list.push(blog);
        }
      }
    }
    blogs_list.sort((a, b) => b.createdAt - a.createdAt);
    res.status(200).json({ message: "Found blogs.", result: blogs_list });
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: "Something went wrong" });
  }
});

module.exports = app;
