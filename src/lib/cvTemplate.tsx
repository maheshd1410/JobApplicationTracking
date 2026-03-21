import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

export type CvExperience = {
  start: string;
  end: string;
  role: string;
  company: string;
  location: string;
  bullets: string[];
};

export type CvEducation = {
  date: string;
  title: string;
  school: string;
  location: string;
};

export type CvData = {
  name: string;
  title: string;
  summary: string;
  contact: {
    address: string;
    phone: string;
    email: string;
    linkedin: string;
  };
  websites: string[];
  core_skills: string[];
  specialties: string[];
  experience: CvExperience[];
  education: CvEducation[];
  certifications: string[];
  impact: string[];
};

const colors = {
  navy: "#0b3f5f",
  navyDark: "#083149",
  accent: "#0a4d6e",
  text: "#1d1f23",
  muted: "#5e6b75",
  line: "#d6d9dd",
};

const styles = StyleSheet.create({
  page: {
    flexDirection: "row",
    fontFamily: "Helvetica",
    fontSize: 10,
    color: colors.text,
    backgroundColor: "#ffffff",
  },
  sidebar: {
    width: 170,
    backgroundColor: colors.navy,
    color: "#ffffff",
    padding: 20,
  },
  main: {
    flex: 1,
    padding: 24,
  },
  photoWrap: {
    width: 120,
    height: 120,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 14,
    alignSelf: "center",
    backgroundColor: colors.navyDark,
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 1.2,
  },
  role: {
    marginTop: 6,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  sidebarSection: {
    marginTop: 18,
  },
  sidebarTitle: {
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sidebarText: {
    fontSize: 9,
    lineHeight: 1.5,
  },
  bullet: {
    fontSize: 9,
    lineHeight: 1.4,
    marginBottom: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 0.8,
    color: colors.accent,
    textTransform: "uppercase",
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 4,
    marginBottom: 8,
  },
  summary: {
    fontSize: 9.5,
    lineHeight: 1.5,
    color: colors.text,
  },
  experienceRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  expDate: {
    width: 68,
    fontSize: 9,
    color: colors.muted,
  },
  expBody: {
    flex: 1,
  },
  expRole: {
    fontSize: 10,
    fontWeight: "bold",
  },
  expCompany: {
    fontSize: 9,
    color: colors.muted,
    marginBottom: 4,
  },
  listItem: {
    fontSize: 9,
    lineHeight: 1.4,
    marginBottom: 3,
  },
  eduRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  eduDate: {
    width: 68,
    fontSize: 9,
    color: colors.muted,
  },
  eduBody: {
    flex: 1,
  },
  eduTitle: {
    fontSize: 9.5,
    fontWeight: "bold",
  },
  eduSchool: {
    fontSize: 9,
    color: colors.muted,
  },
});

function BulletList({ items }: { items: string[] }) {
  return (
    <View>
      {items.map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.listItem}>
          • {item}
        </Text>
      ))}
    </View>
  );
}

export function CvDocument({
  data,
  photoUrl,
}: {
  data: CvData;
  photoUrl?: string | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.sidebar}>
          {photoUrl ? (
            <View style={styles.photoWrap}>
              <Image src={photoUrl} style={styles.photo} />
            </View>
          ) : null}
          <Text style={styles.name}>{data.name || "Your Name"}</Text>
          <Text style={styles.role}>{data.title || "Your Title"}</Text>

          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarTitle}>Contact</Text>
            <Text style={styles.sidebarText}>{data.contact.address}</Text>
            <Text style={styles.sidebarText}>{data.contact.phone}</Text>
            <Text style={styles.sidebarText}>{data.contact.email}</Text>
            <Text style={styles.sidebarText}>{data.contact.linkedin}</Text>
          </View>

          {data.websites.length ? (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>Websites</Text>
              {data.websites.map((site, index) => (
                <Text key={`${site}-${index}`} style={styles.sidebarText}>
                  • {site}
                </Text>
              ))}
            </View>
          ) : null}

          {data.core_skills.length ? (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>Core Skills</Text>
              {data.core_skills.map((skill, index) => (
                <Text key={`${skill}-${index}`} style={styles.sidebarText}>
                  • {skill}
                </Text>
              ))}
            </View>
          ) : null}

          {data.specialties.length ? (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarTitle}>Specialties</Text>
              {data.specialties.map((skill, index) => (
                <Text key={`${skill}-${index}`} style={styles.sidebarText}>
                  • {skill}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.main}>
          <View style={styles.section}>
            <Text style={styles.summary}>{data.summary}</Text>
          </View>

          {data.experience.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Professional Experience</Text>
              {data.experience.map((exp, index) => (
                <View key={`${exp.company}-${index}`} style={styles.experienceRow}>
                  <Text style={styles.expDate}>
                    {exp.start} - {exp.end}
                  </Text>
                  <View style={styles.expBody}>
                    <Text style={styles.expRole}>{exp.role}</Text>
                    <Text style={styles.expCompany}>
                      {exp.company}
                      {exp.location ? `, ${exp.location}` : ""}
                    </Text>
                    <BulletList items={exp.bullets} />
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {data.education.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Education</Text>
              {data.education.map((edu, index) => (
                <View key={`${edu.title}-${index}`} style={styles.eduRow}>
                  <Text style={styles.eduDate}>{edu.date}</Text>
                  <View style={styles.eduBody}>
                    <Text style={styles.eduTitle}>{edu.title}</Text>
                    <Text style={styles.eduSchool}>
                      {edu.school}
                      {edu.location ? ` - ${edu.location}` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {data.certifications.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certifications</Text>
              <BulletList items={data.certifications} />
            </View>
          ) : null}

          {data.impact.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Platform & Product Impact</Text>
              <BulletList items={data.impact} />
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

export async function renderCvPdfBuffer(
  data: CvData,
  photoUrl?: string | null
) {
  return renderToBuffer(<CvDocument data={data} photoUrl={photoUrl} />);
}
