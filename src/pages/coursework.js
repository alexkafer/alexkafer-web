import React from 'react';

import Layout from '../components/Layout';
import { Link } from "gatsby"
import { graphql } from 'gatsby';
import Sidebar from '../components/Sidebar';

import { documentToReactComponents } from "@contentful/rich-text-react-renderer"

export const query = graphql`
  query {
    allContentfulCourses {
      edges {
        node {
          id
          classTitle
          classDescription {
            raw
          }
          classDate
          projects {
            id
            projectTitle
            projectDescription {
              raw
            }
            youtubeID
          }
        }
      }
    }
  }`;

function DisplayProjects(props) {
  if (props.projects) {
    return (<ul className="fa-ul mb-0">
      {
        props.projects.map((project, index) => {
          return (
            <li key={project.id}>
              <i className="fa-li fab fa-youtube"></i>
              <Link to={"/course/" + props.courseId + "/#" + project.id} >{project.projectTitle}</Link>
            </li>)
        })
      }
    </ul>)
  } else {
    return null;
  }
}

const CourseWorkPage = ({ data }) => (
  <Layout>
    <Sidebar />
    <div className="container-fluid p-0">
      <section
        className="resume-section p-3 p-lg-5 d-flex align-items-center"
        id="about"
      >
        <div className="w-100">
          <h1 className="mb-0">
            <span className="text-primary">Coursework</span>
          </h1>
          <div className="subheading mb-5">
            Coursework
          </div>
          <p className="lead mb-5">
            
          </p>
        </div>
      </section>

      <hr className="m-0" />

      <section
        className="resume-section p-3 p-lg-5 d-flex justify-content-center"
        id="courses"
      >
        <div className="w-100">
          <h2 className="mb-5">Courses</h2>

          {data.allContentfulCourses.edges.map((course, index) => {
            console.log("Course: ", course.node)
    
            return (
              <div key={course.id} className="resume-item d-flex flex-column flex-md-row justify-content-between mb-5">
                <div key={course.id} className="resume-content">
                  <h3 className="mb-0">{}</h3>
                  <div className="subheading mb-3">{course.node.classTitle}</div>
                  { documentToReactComponents(JSON.parse(course.node.classDescription.raw))}
                  <DisplayProjects projects={course.node.projects} courseId={course.node.id}/>
                </div>
                
                <div className="resume-date text-md-right">
                  <span className="text-primary">{ course.node.classDate}</span>
                </div>
              </div>)
          })}
        </div>
      </section>
    </div>
  </Layout>
);

export default CourseWorkPage;
