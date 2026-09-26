const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".site-nav");

menuButton.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
});

navigation.addEventListener("click", () => {
  navigation.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");
});

document.getElementById("year").textContent = new Date().getFullYear();

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12 },
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
