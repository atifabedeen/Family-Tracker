import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "123456", //Not the correct password, I'll update the readme doc once I figure out how to change password in PostgreSQL
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;
let err;

let users = [
  { id: 1, name: "Atif", color: "teal" },
  { id: 2, name: "Jack", color: "powderblue" },
];

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    if(country === "IO") {
      country = "IN"
    }
    countries.push(country.country_code);
  });
  return countries;
}
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const curColor = await db.query("SELECT color FROM users WHERE id = $1", [currentUserId])
  const userList = await db.query("SELECT * FROM users")
  users = userList.rows
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: curColor,
    error: err
  });
  err = "";
});

app.post("/user", async(req, res) => {
  if(req.body.add === "new") {
    res.render("new.ejs")
  }
  else {
    currentUserId = req.body.user;
    res.redirect("/");
  }
})

app.post("/add", async (req, res) => {
  const country = req.body.country;
  const result = await db.query("SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%' ", [country.toLowerCase()])
  if(result.rows.length !== 0) {
    let code = result.rows[0].country_code;
    if(code === "IO") {
      code = "IN";
    }
    const exists = await db.query("SELECT * FROM visited_countries WHERE user_id = $1 AND country_code = $2", [currentUserId, code])
    if(exists.rows.length !== 0) {
      err = "Country already added for this user, try again"
    }
  
    else {
      await db.query("INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)", [code, currentUserId])
    }
  }
  else{
    err = "Country does not exist, check your spelling."
  }
  res.redirect("/")
})


app.post("/new", async (req, res) => {
  let userName = req.body.name;
  let color = req.body.color;
  const queryR = await db.query("SELECT name FROM users WHERE LOWER(name) = $1", [userName.toLowerCase()])
  if (queryR.rows.length > 0) {
    res.render("new.ejs", {err: "User name already exists!"})
  }

  else{
  const result = await db.query("INSERT INTO users (name, color) VALUES ($1, $2) RETURNING *;", [userName, color])
  const id = result.rows[0].id;
  currentUserId = id;
  res.redirect("/")
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
