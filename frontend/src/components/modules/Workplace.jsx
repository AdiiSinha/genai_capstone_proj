import React from "react";
import { news, buses } from "../../data";
import { Title } from "../common/Title";

export function Workplace() {
  return (
    <div className="module">
      <Title k="EMPLOYEE EXPERIENCE" t="Campus pulse" />
      <div className="work">
        <div className="mapbig">
          <div>
            CAPGEMINI
            <br />
            <small>HQ</small>
          </div>
          <span>●</span>
          <span>●</span>
        </div>
        <div>
          {news.map(x => (
            <article className="news" key={x[1]}>
              <b>
                {x[0]} {x[1]}
              </b>
              <p>{x[2]}</p>
            </article>
          ))}
          {buses.map(x => (
            <article className="bus" key={x[0]}>
              <b>{x[0]}</b>
              <span>{x[3]}</span>
              <small>
                {x[1]} · {x[2]}
              </small>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Workplace;
