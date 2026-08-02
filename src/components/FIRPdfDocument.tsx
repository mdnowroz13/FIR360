import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.5,
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  label: {
    width: 150,
    fontWeight: 'bold',
  },
  value: {
    flex: 1,
  },
  section: {
    marginTop: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    padding: 4,
    marginBottom: 10,
  },
  narrativeBox: {
    borderWidth: 1,
    borderColor: '#000',
    padding: 10,
    minHeight: 200,
    marginTop: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: 150,
    borderTopWidth: 1,
    borderTopColor: '#000',
    textAlign: 'center',
    paddingTop: 5,
  }
});

export const FIRPdfDocument = ({ draft, officer }: { draft: any, officer: any }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>FIRST INFORMATION REPORT</Text>
        <Text style={styles.subtitle}>(Under Section 154 Cr.P.C. / BNSS)</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>1. District:</Text>
        <Text style={styles.value}>{officer?.station_jurisdiction || 'N/A'}</Text>
        <Text style={styles.label}>P.S.:</Text>
        <Text style={styles.value}>{officer?.station_name || 'N/A'}</Text>
        <Text style={styles.label}>Year:</Text>
        <Text style={styles.value}>{new Date().getFullYear()}</Text>
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>FIR No:</Text>
        <Text style={styles.value}>{draft.id.split('-')[0].toUpperCase()}</Text>
        <Text style={styles.label}>Date:</Text>
        <Text style={styles.value}>{new Date().toLocaleDateString('en-IN')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Acts & Sections applied (Confirmed)</Text>
        {draft.officer_confirmed_sections?.map((sec: any, idx: number) => (
          <Text key={idx}>- {sec.code}: {sec.title}</Text>
        ))}
        {(!draft.officer_confirmed_sections || draft.officer_confirmed_sections.length === 0) && (
          <Text>None</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Occurrence of Offence</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Date & Time:</Text>
          <Text style={styles.value}>{draft.incident_date || 'N/A'} {draft.incident_time || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{draft.incident_location || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Complainant / Informant</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Name:</Text>
          <Text style={styles.value}>{draft.complainant_name || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Contact:</Text>
          <Text style={styles.value}>{draft.complainant_contact || 'N/A'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.value}>{draft.complainant_address || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Details of known/suspected/unknown accused</Text>
        {draft.involved_parties?.map((party: any, idx: number) => (
          <Text key={idx}>- {party.name} ({party.role}) - {party.address}</Text>
        ))}
        {(!draft.involved_parties || draft.involved_parties.length === 0) && (
          <Text>Unknown</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Reasons for delay in reporting (if any)</Text>
        <Text>N/A</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>7. Complaint Narrative</Text>
        <View style={styles.narrativeBox}>
          <Text>{draft.incident_narrative || 'No narrative provided.'}</Text>
          {draft.additional_details && Object.keys(draft.additional_details).length > 0 && (
            <>
              <Text style={{ marginTop: 10, fontWeight: 'bold' }}>Additional Extracted Details:</Text>
              {Object.entries(draft.additional_details).map(([k, v]) => (
                <Text key={k}>- {k}: {String(v)}</Text>
              ))}
            </>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.signatureBox}>
          <Text>Signature/Thumb impression of Complainant</Text>
        </View>
        <View style={styles.signatureBox}>
          <Text>Signature of Officer in Charge</Text>
          <Text>Name: {officer?.name}</Text>
          <Text>Badge: {officer?.badge_number || 'N/A'}</Text>
        </View>
      </View>
    </Page>
  </Document>
);
